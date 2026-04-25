const router = require('express').Router();
const { Room, RoomBooking } = require('../models/RoomModels');
const { Sale } = require('../models/Finance');
const Notif = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Auto-marks bookings as no_show if check-in date passed with no action (4hr grace)
async function cleanStaleReservations() {
  const grace = new Date(Date.now() - 4 * 3600000);
  const stale = await RoomBooking.find({ status: 'confirmed', checkIn: { $lt: grace } }).select('_id room');
  await Promise.all(stale.map(async b => {
    await RoomBooking.findByIdAndUpdate(b._id, {
      status: 'no_show',
      $push: { changeLog: { action: 'no_show', note: 'Auto-marked: check-in passed without check-in action', performedAt: new Date() } },
    });
    await Room.findOneAndUpdate({ _id: b.room, status: 'reserved' }, { status: 'available' });
  }));
}

// ── ROOM MANAGEMENT ───────────────────────────────────────────────
router.get('/rooms', protect, async (req, res) => {
  try {
    await cleanStaleReservations();
    const f = {};
    if (req.query.status)   f.status   = req.query.status;
    if (req.query.roomType) f.roomType = req.query.roomType;
    res.json(await Room.find(f).populate('createdBy','name').sort('roomNumber'));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/rooms', protect, async (req, res) => {
  try { res.status(201).json(await Room.create({ ...req.body, createdBy: req.user._id })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/rooms/:id', protect, async (req, res) => {
  try { res.json(await Room.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/rooms/:id', protect, async (req, res) => {
  try { await Room.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// Check room availability for date range
router.post('/rooms/availability', protect, async (req, res) => {
  try {
    const { checkIn, checkOut, roomType, excludeId } = req.body;
    const ci = new Date(checkIn); const co = new Date(checkOut);
    if (ci >= co) return res.status(400).json({ message: 'Check-out must be after check-in' });
    const roomQ = { status: { $ne: 'maintenance' } };
    if (roomType) roomQ.roomType = roomType;
    const allRooms = await Room.find(roomQ);
    const bookingQ = { status: { $nin: ['cancelled','checked_out'] }, checkIn: { $lt: co }, checkOut: { $gt: ci } };
    if (excludeId) bookingQ._id = { $ne: excludeId };
    const bookedIds = await RoomBooking.distinct('room', bookingQ);
    const available = allRooms.filter(r => !bookedIds.some(id => id.toString() === r._id.toString()));
    res.json(available);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── BOOKINGS ──────────────────────────────────────────────────────
router.get('/bookings', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.status)        f.status        = req.query.status;
    if (req.query.paymentStatus) f.paymentStatus = req.query.paymentStatus;
    if (req.query.roomType)      f.roomType      = req.query.roomType;
    if (req.query.todayCheckin) {
      const d = new Date(); const s = new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0); const e = new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59);
      f.checkIn = { $gte:s, $lte:e };
    }
    if (req.query.todayCheckout) {
      const d = new Date(); const s = new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0); const e = new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59);
      f.checkOut = { $gte:s, $lte:e };
    }
    const bookings = await RoomBooking.find(f)
      .populate('room','roomNumber roomType pricePerNight floor')
      .populate('createdBy','name role')
      .populate('checkedInBy','name role')
      .populate('checkedOutBy','name role')
      .populate('paymentUpdatedBy','name role')
      .populate('changeLog.performedBy','name role')
      .sort('-createdAt');
    res.json(bookings);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/bookings/:id', protect, async (req, res) => {
  try {
    const b = await RoomBooking.findById(req.params.id)
      .populate('room')
      .populate('createdBy','name role email mobile')
      .populate('checkedInBy','name role')
      .populate('checkedOutBy','name role')
      .populate('paymentUpdatedBy','name role')
      .populate('changeLog.performedBy','name role');
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    res.json(b);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/bookings', protect, async (req, res) => {
  try {
    const ci = new Date(req.body.checkIn); const co = new Date(req.body.checkOut);

    // Validations
    const today = new Date(); today.setHours(0,0,0,0);
    if (ci < today) return res.status(400).json({ message: 'Check-in cannot be in the past' });
    if (ci >= co) return res.status(400).json({ message: 'Check-out must be after check-in' });
    if (!/^\d{10}$/.test(req.body.customerMobile)) return res.status(400).json({ message: 'Mobile must be 10 digits' });
    if (!req.body.idProofNumber) return res.status(400).json({ message: 'ID proof is mandatory' });

    // Validate Advance Payment
    const nights = Math.max(1, Math.ceil((co - ci) / 86400000));
    const roomCost = (parseFloat(req.body.pricePerNight) || 0) * nights;
    const extras = (parseFloat(req.body.extraBedCharges) || 0) + (parseFloat(req.body.foodCharges) || 0) + (parseFloat(req.body.serviceCharges) || 0);
    const taxAmt = ((roomCost + extras) * (parseFloat(req.body.gstRate) || 0)) / 100;
    const totalAmount = roomCost + extras + taxAmt;
    if (parseFloat(req.body.advancePayment || 0) > totalAmount) {
      return res.status(400).json({ message: 'Advance payment cannot exceed total amount' });
    }

    // Overlap check
    const conflict = await RoomBooking.findOne({ room: req.body.room, status: { $nin:['cancelled','checked_out'] }, checkIn: { $lt: co }, checkOut: { $gt: ci } });
    if (conflict) return res.status(409).json({ message: `Room already booked — Ref: ${conflict.bookingRef}` });

    const booking = await RoomBooking.create({ ...req.body, createdBy: req.user._id });

    // Populate room info
    const room = await Room.findById(req.body.room);
    if (room) { booking.roomType = room.roomType; booking.roomNumber = room.roomNumber; await booking.save(); room.status = 'reserved'; await room.save(); }

    await Notif.notifyRoles(['rooms_manager','gm','chairman','secretary'], 'New Room Booking',
      `${booking.bookingRef} — ${booking.customerName}, ${room?.roomNumber||''} (${booking.roomType}), Check-in: ${ci.toLocaleDateString('en-IN')}`,
      'info', booking._id, 'rooms');
    res.status(201).json(booking);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/bookings/:id', protect, async (req, res) => {
  try {
    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    const { action, note, ...data } = req.body;
    const log = { performedBy: req.user._id, performedAt: new Date() };

    if (action === 'check_in') {
      booking.status      = 'checked_in';
      booking.checkedInBy = req.user._id;
      booking.checkedInAt = new Date();
      log.action = 'checked_in'; log.note = `Checked in by ${req.user.name}`;
      const room = await Room.findById(booking.room);
      if (room) { room.status = 'occupied'; await room.save(); }
      await Notif.notifyRoles(['rooms_manager','gm'], '🏨 Check-In', `${booking.bookingRef} — ${booking.customerName} checked in to ${booking.roomNumber}`, 'info', booking._id, 'rooms');
    } else if (action === 'check_out') {
      booking.status       = 'checked_out';
      booking.checkedOutBy = req.user._id;
      booking.checkedOutAt = new Date();
      log.action = 'checked_out'; log.note = `Checked out by ${req.user.name}`;
      const room = await Room.findById(booking.room);
      if (room) { room.status = 'available'; await room.save(); }
      await Notif.notifyRoles(['rooms_manager','gm'], 'Check-Out', `${booking.bookingRef} — ${booking.customerName} checked out from ${booking.roomNumber}`, 'info', booking._id, 'rooms');
      const existingSale = await Sale.findOne({ invoiceNumber: booking.bookingRef });
      if (!existingSale) {
        await Sale.create({
          department: 'rooms',
          category:   'Room Booking',
          date:        new Date(),
          amount:      booking.totalAmount,
          description: `${booking.bookingRef} — ${booking.customerName} (${booking.numberOfNights} night${booking.numberOfNights > 1 ? 's' : ''})`,
          invoiceNumber: booking.bookingRef,
          paymentMode:   booking.paymentMode || 'cash',
          recordedBy:    req.user._id,
        });
      }
    } else if (action === 'cancel') {
      booking.status = 'cancelled';
      log.action = 'cancelled'; log.note = note || `Cancelled by ${req.user.name}`;
      const room = await Room.findById(booking.room);
      if (room && room.status === 'reserved') { room.status = 'available'; await room.save(); }
    } else if (action === 'update_payment') {
      const adv = parseFloat(data.advancePayment) || booking.advancePayment;
      if (adv > booking.totalAmount) return res.status(400).json({ message: 'Advance cannot exceed total' });
      booking.advancePayment   = adv;
      booking.paymentStatus    = data.paymentStatus;
      booking.paymentMode      = data.paymentMode || booking.paymentMode;
      booking.paymentUpdatedBy = req.user._id;
      booking.paymentUpdatedAt = new Date();
      booking.balanceAmount    = Math.max(0, booking.totalAmount - adv);
      log.action = 'payment_updated'; log.note = `Payment: ${data.paymentStatus}, advance ₹${adv} — by ${req.user.name}`;
    } else {
      Object.assign(booking, data);
      log.action = 'updated'; log.note = note || `Updated by ${req.user.name}`;
    }
    booking.changeLog.push(log);
    await booking.save();
    res.json(booking);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Dashboard stats — 6.2
router.get('/stats', protect, async (req, res) => {
  try {
    await cleanStaleReservations();
    const now    = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,  0,  0);
    const todayE = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);
    const wStart = new Date(now.getTime() - 6*86400000);

    const [
      totalRooms, occupiedRooms, availableRooms, maintenanceRooms,
      todayBookings, monthBookings, weekBookings,
      checkInsToday, checkOutsToday,
      pendingPayments,
    ] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'occupied' }),
      Room.countDocuments({ status: 'available' }),
      Room.countDocuments({ status: 'maintenance' }),
      RoomBooking.countDocuments({ createdAt: { $gte:today,$lte:todayE }, status: { $ne:'cancelled' } }),
      RoomBooking.countDocuments({ createdAt: { $gte:mStart,$lte:mEnd }, status: { $ne:'cancelled' } }),
      RoomBooking.countDocuments({ createdAt: { $gte:wStart }, status: { $ne:'cancelled' } }),
      RoomBooking.find({ checkIn: { $gte:today,$lte:todayE }, status: { $in:['confirmed','checked_in'] } }).populate('room','roomNumber roomType'),
      RoomBooking.find({ checkOut: { $gte:today,$lte:todayE }, status:'checked_in' }).populate('room','roomNumber roomType'),
      RoomBooking.find({ paymentStatus: { $in:['due','partial'] }, status: { $nin:['cancelled','checked_out'] } }).populate('room','roomNumber').sort('checkOut').limit(10),
    ]);

    // Revenue 6 months
    const months6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const fr = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59);
      const [r] = await RoomBooking.aggregate([{ $match:{ createdAt:{$gte:fr,$lte:to}, status:{$nin:['cancelled']} } }, { $group:{ _id:null, rev:{$sum:'$totalAmount'}, cnt:{$sum:1} } }]);
      months6.push({ month: fr.toLocaleString('default',{month:'short',year:'2-digit'}), revenue: r?.rev||0, bookings: r?.cnt||0 });
    }

    res.json({
      totalRooms, occupiedRooms, availableRooms, maintenanceRooms,
      occupancyRate: totalRooms ? Math.round((occupiedRooms/totalRooms)*100) : 0,
      todayBookings, monthBookings, weekBookings,
      checkInsToday:  checkInsToday.length,
      checkOutsToday: checkOutsToday.length,
      checkInsList:   checkInsToday,
      checkOutsList:  checkOutsToday,
      pendingPayments,
      monthRevenue: months6[months6.length-1]?.revenue || 0,
      months6,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
