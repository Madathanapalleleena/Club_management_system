const router = require('express').Router();
const BanquetBooking = require('../models/BanquetBooking');
const { Sale } = require('../models/Finance');
const Notif = require('../models/Notification');
const User  = require('../models/User');
const { protect } = require('../middleware/auth');

// GET all bookings
router.get('/', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.status)        f.status        = req.query.status;
    if (req.query.paymentStatus) f.paymentStatus = req.query.paymentStatus;
    if (req.query.banquetType)   f.banquetType   = req.query.banquetType;
    if (req.query.month) {
      const now = new Date();
      f.bookingDate = { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lte: new Date(now.getFullYear(), now.getMonth()+1, 0) };
    }
    if (req.query.from) f.bookingDate = { ...(f.bookingDate||{}), $gte: new Date(req.query.from) };
    if (req.query.to)   f.bookingDate = { ...(f.bookingDate||{}), $lte: new Date(req.query.to) };
    const docs = await BanquetBooking.find(f)
      .populate('createdBy','name role')
      .populate('paymentUpdatedBy','name role')
      .populate('changeLog.performedBy','name role')
      .sort('bookingDate');
    res.json(docs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Monthly dashboard stats
router.get('/stats', protect, async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to   = new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999);
    const [allMonth, upcoming, pendingPay, bySlot] = await Promise.all([
      BanquetBooking.find({ bookingDate: { $gte:from, $lte:to }, status: { $ne:'cancelled' } }),
      BanquetBooking.find({ bookingDate: { $gte: d, $lte: new Date(d.getTime()+7*86400000) }, status:'confirmed' }).sort('bookingDate').limit(6).populate('createdBy','name'),
      BanquetBooking.find({ paymentStatus: { $in:['due','partial'] }, status: { $ne:'cancelled' }, bookingDate: { $lte: new Date(d.getTime()+30*86400000) } }).sort('bookingDate').limit(10),
      BanquetBooking.aggregate([{ $match:{ bookingDate:{$gte:from,$lte:to}, status:{$ne:'cancelled'} } }, { $group:{ _id:'$slot', count:{$sum:1} } }]),
    ]);
    const slotMap = { morning:0, afternoon:0, evening:0 };
    bySlot.forEach(s => { if (slotMap[s._id]!==undefined) slotMap[s._id] = s.count; });
    res.json({
      totalEvents:     allMonth.length,
      revenue:         allMonth.reduce((s,b)=>s+(b.totalAmount||0),0),
      confirmedEvents: allMonth.filter(b=>b.status==='confirmed').length,
      completedEvents: allMonth.filter(b=>b.status==='completed').length,
      bySlot:          slotMap,
      upcoming,
      pendingPayments: pendingPay,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Calendar view (full month)
router.get('/calendar/:year/:month', protect, async (req, res) => {
  try {
    const { year, month } = req.params;
    const docs = await BanquetBooking.find({
      bookingDate: { $gte: new Date(year, month-1, 1), $lte: new Date(year, month, 0) },
      status: { $ne: 'cancelled' },
    }).select('banquetType slot bookingDate eventType customerName numberOfPersons status paymentStatus bookingRef');
    res.json(docs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Check slot availability — CORE: no double booking
router.post('/check-availability', protect, async (req, res) => {
  try {
    const { banquetType, bookingDate, slot, excludeId } = req.body;
    if (!banquetType || !bookingDate || !slot) return res.status(400).json({ message: 'banquetType, bookingDate, slot required' });
    const d = new Date(bookingDate);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    const q = { banquetType, slot, bookingDate: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } };
    if (excludeId) q._id = { $ne: excludeId };
    const conflict = await BanquetBooking.findOne(q).select('bookingRef customerName bookingDate slot');
    res.json({ available: !conflict, conflictWith: conflict || null });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get single booking
router.get('/:id', protect, async (req, res) => {
  try {
    const b = await BanquetBooking.findById(req.params.id)
      .populate('createdBy','name role email')
      .populate('paymentUpdatedBy','name role')
      .populate('changeLog.performedBy','name role');
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    res.json(b);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create booking — validates slot, future date, mobile
router.post('/', protect, async (req, res) => {
  try {
    // Future date check
    const bd = new Date(req.body.bookingDate);
    const today = new Date(); today.setHours(0,0,0,0);
    if (bd < today) return res.status(400).json({ message: 'Cannot book past dates' });

    // Mobile validation
    if (!/^\d{10}$/.test(req.body.customerMobile)) return res.status(400).json({ message: 'Mobile must be 10 digits' });

    // Advance ≤ Total check
    const buffet = (req.body.numberOfPersons || 0) * (req.body.pricePerBuffet || 0);
    const charges = req.body.banquetCharges || 0;
    const tax = ((buffet + charges) * (req.body.gstRate || 0)) / 100;
    const total = buffet + charges + tax;
    if ((req.body.advancePayment || 0) > total) return res.status(400).json({ message: 'Advance cannot exceed total amount' });

    // Double-booking check
    const d = new Date(bd.getFullYear(), bd.getMonth(), bd.getDate(), 0, 0, 0);
    const e = new Date(bd.getFullYear(), bd.getMonth(), bd.getDate(), 23, 59, 59);
    const conflict = await BanquetBooking.findOne({ banquetType: req.body.banquetType, slot: req.body.slot, bookingDate: { $gte:d, $lte:e }, status: { $ne:'cancelled' } });
    if (conflict) return res.status(409).json({ message: `Slot already booked — Ref: ${conflict.bookingRef}` });

    const booking = await BanquetBooking.create({ ...req.body, createdBy: req.user._id });

    // Notify banquet manager, accounts, HOD
    await Notif.notifyRoles(['banquet_manager','accounts_manager','gm','chairman','secretary'],
      'New Banquet Booking', `${booking.bookingRef} — ${booking.eventType} at ${booking.banquetType} on ${bd.toLocaleDateString('en-IN')} (${booking.slot} slot) | ${booking.numberOfPersons} persons | ₹${booking.totalAmount}`,
      'info', booking._id, 'banquet');

    res.status(201).json(booking);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Update booking
router.put('/:id', protect, async (req, res) => {
  try {
    const booking = await BanquetBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    const { action, note, ...data } = req.body;
    const log = { performedBy: req.user._id, performedAt: new Date() };

    if (action === 'update_payment') {
      // Only accounts can update payment
      if (!['accounts_manager', 'general_manager', 'chairman', 'secretary'].includes(req.user.role)) {
         return res.status(403).json({ message: 'Only accounts team can update payment status' });
      }
      const adv = parseFloat(data.advancePayment) || booking.advancePayment;
      if (adv > booking.totalAmount) return res.status(400).json({ message: 'Advance cannot exceed total' });
      booking.advancePayment   = adv;
      booking.paymentStatus    = data.paymentStatus;
      booking.paymentMode      = data.paymentMode || booking.paymentMode;
      booking.paymentUpdatedBy = req.user._id;
      booking.paymentUpdatedAt = new Date();
      booking.balanceAmount    = Math.max(0, booking.totalAmount - adv);
      log.action = 'payment_updated'; log.note = `Payment: ${data.paymentStatus}, advance ₹${adv} — by ${req.user.name}`;
      if (data.paymentStatus === 'paid')
        await Notif.notifyRoles(['banquet_manager','accounts_manager'], '✅ Banquet Fully Paid', `${booking.bookingRef} — payment complete`, 'success', booking._id, 'banquet');
    } else if (action === 'complete') {
      booking.status = 'completed';
      log.action = 'completed'; log.note = `Event completed by ${req.user.name}`;
      const existingSale = await Sale.findOne({ invoiceNumber: booking.bookingRef });
      if (!existingSale) {
        await Sale.create({
          department:    'banquet',
          category:      booking.eventType || 'Event Booking',
          date:          new Date(),
          amount:        booking.totalAmount,
          description:   `${booking.bookingRef} — ${booking.eventType} for ${booking.customerName} (${booking.numberOfPersons} persons)`,
          invoiceNumber: booking.bookingRef,
          paymentMode:   booking.paymentMode || 'cash',
          recordedBy:    req.user._id,
        });
      }
    } else if (action === 'cancel') {
      booking.status = 'cancelled';
      log.action = 'cancelled'; log.note = note || `Cancelled by ${req.user.name}`;
    } else {
      Object.assign(booking, data);
      log.action = 'updated'; log.note = note || `Updated by ${req.user.name}`;
    }
    booking.changeLog.push(log);
    await booking.save();
    res.json(booking);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Event reminders — 1/2/3 days before confirmed bookings
router.post('/run-reminders', protect, async (req, res) => {
  try {
    let reminders = 0;
    for (const daysAhead of [3, 2, 1]) {
      const target   = new Date(Date.now() + daysAhead*86400000);
      const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0);
      const dayEnd   = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59);
      const bookings = await BanquetBooking.find({ bookingDate:{$gte:dayStart,$lte:dayEnd}, status:'confirmed', reminderDays:{$ne:daysAhead} });
      for (const b of bookings) {
        await Notif.notifyRoles(['banquet_manager'], `Event in ${daysAhead} Day(s)`, `${b.bookingRef} — ${b.eventType} for ${b.customerName} on ${new Date(b.bookingDate).toLocaleDateString('en-IN')} (${b.slot})`, 'warning', b._id, 'banquet');
        b.reminderDays.push(daysAhead); await b.save(); reminders++;
      }
    }
    res.json({ reminders });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Payment-due alerts — daily for events with pending/partial payment
router.post('/run-alerts', protect, async (req, res) => {
  try {
    let paymentAlerts = 0;
    const overdue = await BanquetBooking.find({ bookingDate:{$lte:new Date()}, paymentStatus:{$in:['due','partial']}, status:{$ne:'cancelled'} });
    const today = new Date().toISOString().slice(0, 10);
    for (const b of overdue) {
      const alreadyToday = b.paymentAlertDates?.some(d => d.toISOString().slice(0,10) === today);
      if (!alreadyToday) {
        await Notif.notifyRoles(['banquet_manager','accounts_manager'], `Payment ${b.paymentStatus === 'partial' ? 'Partial' : 'Due'}`, `${b.bookingRef} — Balance ₹${b.balanceAmount} — ${b.customerName}`, 'alert', b._id, 'banquet');
        b.paymentAlertDates = [...(b.paymentAlertDates || []), new Date()]; await b.save(); paymentAlerts++;
      }
    }
    res.json({ paymentAlerts });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
