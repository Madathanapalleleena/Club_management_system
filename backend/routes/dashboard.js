const router   = require('express').Router();
const Director = require('../models/Director');
const PO       = require('../models/PurchaseOrder');
const PReq     = require('../models/ProcurementRequest');
const { Item } = require('../models/StoreModels');
const { Sale, Expense } = require('../models/Finance');
const BanquetBooking    = require('../models/BanquetBooking');
const { Room, RoomBooking } = require('../models/RoomModels');
const { Vendor }        = require('../models/Vendor');
const User              = require('../models/User');
const { protect }       = require('../middleware/auth');

function parseDateRange(from, to) {
  const endDate = to ? new Date(to) : new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = from ? new Date(from) : new Date(endDate);
  if (!from) { startDate.setDate(startDate.getDate() - 29); }
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

async function getMonthly(from, to) {
  const { startDate, endDate } = parseDateRange(from, to);
  const [sales, expenses] = await Promise.all([
    Sale.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, t: { $sum: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, t: { $sum: '$amount' } } }
    ])
  ]);
  const salesMap   = sales.reduce((a, c) => ({ ...a, [c._id]: c.t }), {});
  const expenseMap = expenses.reduce((a, c) => ({ ...a, [c._id]: c.t }), {});
  const days = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dateStr = cur.toISOString().split('T')[0];
    const s = salesMap[dateStr] || 0, e = expenseMap[dateStr] || 0;
    days.push({ month: new Date(cur).toLocaleDateString('default', { month: 'short', day: 'numeric' }), sales: s, expenses: e, profit: s - e });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

async function getPnL(from, to) {
  const { startDate, endDate } = parseDateRange(from, to);
  const [sA, eA] = await Promise.all([
    Sale.aggregate([{ $match: { date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: '$department', s: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: '$department', e: { $sum: '$amount' } } }]),
  ]);
  const depts = [...new Set([...sA.map(x => x._id), ...eA.map(x => x._id)])];
  return depts.map(d => ({ department: d, sales: sA.find(x => x._id === d)?.s || 0, expenses: eA.find(x => x._id === d)?.e || 0, profit: (sA.find(x => x._id === d)?.s || 0) - (eA.find(x => x._id === d)?.e || 0) }));
}

async function getStoreSummary() {
  const all = await Item.find({ isActive: true });
  return { total: all.length, adequate: all.filter(i => i.stockStatus === 'adequate').length, low: all.filter(i => i.stockStatus === 'low').length, critical: all.filter(i => i.stockStatus === 'critical').length, outOfStock: all.filter(i => i.stockStatus === 'out_of_stock').length, expiringSoon: all.filter(i => { if (!i.expiryDate) return false; const d = (new Date(i.expiryDate) - Date.now()) / 86400000; return d > 0 && d <= 50; }).length, totalValue: all.reduce((s, i) => s + i.quantity * i.unitPrice, 0) };
}

async function getDeptBreakdown(from, to) {
  const { startDate, endDate } = parseDateRange(from, to);
  const [sales, expenses] = await Promise.all([
    Sale.aggregate([{ $match: { date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: { department: '$department', category: '$category' }, sales: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: { department: '$department', category: '$category' }, expenses: { $sum: '$amount' } } }]),
  ]);
  const map = {};
  sales.forEach(s => { const k = `${s._id.department}||${s._id.category}`; if (!map[k]) map[k] = { department: s._id.department, category: s._id.category, sales: 0, expenses: 0 }; map[k].sales = s.sales; });
  expenses.forEach(e => { const k = `${e._id.department}||${e._id.category}`; if (!map[k]) map[k] = { department: e._id.department, category: e._id.category, sales: 0, expenses: 0 }; map[k].expenses = e.expenses; });
  return Object.values(map).map(r => ({ ...r, profit: r.sales - r.expenses })).sort((a, b) => b.sales - a.sales);
}

router.get('/chairman', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const [directors, monthly, pnl, deptBreakdown, storeSummary, pendingPOs,
      cntPending, cntApproved, cntRejected, cntPO, cntCompleted,
      pendingRequests, lowStockItems, approvedRequests, rejectedRequests, activePOs] = await Promise.all([
      Director.find().populate('createdBy', 'name'),
      getMonthly(from, to), getPnL(from, to), getDeptBreakdown(from, to), getStoreSummary(),
      PO.countDocuments({ orderStatus: { $in: ['draft', 'approved'] } }),
      PReq.countDocuments({ status: 'pending' }),
      PReq.countDocuments({ status: 'approved' }),
      PReq.countDocuments({ status: 'rejected' }),
      PReq.countDocuments({ status: 'po_raised' }),
      PReq.countDocuments({ status: 'completed' }),
      PReq.find({ status: 'pending' }).sort('-createdAt').limit(20)
        .populate('requestedBy', 'name role department'),
      Item.find({ isActive: true, stockStatus: { $in: ['low', 'critical', 'out_of_stock'] } }).sort('quantity').limit(15),
      PReq.find({ status: 'approved' }).sort('-updatedAt').limit(20)
        .populate('requestedBy', 'name role department').populate('approvedBy', 'name role'),
      PReq.find({ status: 'rejected' }).sort('-updatedAt').limit(20)
        .populate('requestedBy', 'name role department').populate('approvedBy', 'name role'),
      PO.find({ orderStatus: { $in: ['draft', 'approved', 'dispatched'] } }).sort('-createdAt').limit(20).populate('vendor', 'name shopName').populate('createdBy', 'name'),
    ]);
    const procStats = { pending: cntPending, approved: cntApproved, rejected: cntRejected, po_raised: cntPO, completed: cntCompleted };
    res.json({ directors, monthly, pnl, deptBreakdown, storeSummary, pendingPOs, procStats, pendingRequests, lowStockItems, approvedRequests, rejectedRequests, activePOs });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/gm', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const [monthly, pnl, storeSummary, pendingReqs, pendingPOs, recentPOs] = await Promise.all([
      getMonthly(from, to), getPnL(from, to), getStoreSummary(),
      PReq.countDocuments({ status: 'pending' }),
      PO.countDocuments({ orderStatus: { $in: ['draft', 'approved', 'dispatched'] } }),
      PO.find().sort('-createdAt').limit(8).populate('vendor', 'name shopName').populate('createdBy', 'name').populate('approvedBy', 'name'),
    ]);
    res.json({ monthly, pnl, storeSummary, pendingReqs, pendingPOs, recentPOs });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/procurement', protect, async (req, res) => {
  try {
    const { GRC } = require('../models/StoreModels');
    const [pReqPending, pReqApproved, poPending, poDelivered, poPayPending, vendorCount, grcPending, recentPOs] = await Promise.all([
      PReq.countDocuments({ status: 'pending' }),
      PReq.countDocuments({ status: 'approved' }),
      PO.countDocuments({ orderStatus: { $in: ['draft', 'approved', 'dispatched'] } }),
      PO.countDocuments({ orderStatus: 'delivered' }),
      PO.countDocuments({ paymentStatus: { $in: ['pending', 'advance'] } }),
      Vendor.countDocuments({ isActive: true }),
      GRC.countDocuments({ status: 'pending' }),
      PO.find().sort('-createdAt').limit(8).populate('vendor', 'name shopName').populate('createdBy', 'name role').populate('approvedBy', 'name role').populate('paymentUpdatedBy', 'name role'),
    ]);
    res.json({ stats: { pReqPending, pReqApproved, poPending, poDelivered, poPayPending, vendorCount, grcPending }, recentPOs });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/store', protect, async (req, res) => {
  try {
    const [summary, lowItems, expiringItems, recentRequests] = await Promise.all([
      getStoreSummary(),
      Item.find({ isActive: true }).then(items => items.filter(i => ['low', 'critical', 'out_of_stock'].includes(i.stockStatus)).sort((a, b) => a.quantity - b.quantity).slice(0, 10)),
      Item.find({ isActive: true, expiryDate: { $lte: new Date(Date.now() + 50 * 86400000), $gte: new Date() } }).sort('expiryDate').limit(10),
      require('../models/StoreModels').InternalRequest.find().sort('-createdAt').limit(8).populate('requestedBy', 'name department role').populate('approvedBy', 'name role').populate('issuedBy', 'name role'),
    ]);
    res.json({ summary, lowItems, expiringItems, recentRequests });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/kitchen', protect, async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query.from, req.query.to);
    const [total, pending, approved, recentReqs] = await Promise.all([
      PReq.countDocuments({ department: 'kitchen' }),
      PReq.countDocuments({ department: 'kitchen', status: 'pending' }),
      PReq.countDocuments({ department: 'kitchen', status: 'approved' }),
      PReq.find({ department: 'kitchen' }).sort('-createdAt').limit(8).populate('requestedBy', 'name').populate('approvedBy', 'name role'),
    ]);
    const reqs = await PReq.find({ department: 'kitchen', status: { $in: ['approved', 'po_raised', 'completed'] }, createdAt: { $gte: startDate, $lte: endDate } });
    const catMap = {}; reqs.forEach(r => r.items.forEach(i => { const c = i.category || 'Uncategorized'; if (!catMap[c]) catMap[c] = { category: c, value: 0 }; catMap[c].value += i.quantity * (i.estimatedPrice || 0); }));
    res.json({ stats: { total, pending, approved }, recentReqs, utilization: Object.values(catMap).sort((a, b) => b.value - a.value).slice(0, 6) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/banquet', protect, async (req, res) => {
  try {
    const d = req.query.to ? new Date(req.query.to) : new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), 1); const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const [allMonth, upcoming, pendingPay] = await Promise.all([BanquetBooking.find({ bookingDate: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } }), BanquetBooking.find({ bookingDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) }, status: 'confirmed' }).sort('bookingDate').limit(6).populate('createdBy', 'name'), BanquetBooking.find({ paymentStatus: { $in: ['due', 'partial'] }, status: { $ne: 'cancelled' } }).sort('bookingDate').limit(10),]);
    const bySlot = { morning: 0, afternoon: 0, evening: 0 }; allMonth.forEach(b => { if (bySlot[b.slot] !== undefined) bySlot[b.slot]++; });
    res.json({ totalEvents: allMonth.length, revenue: allMonth.reduce((s, b) => s + (b.totalAmount || 0), 0), bySlot, upcoming, pendingPayments: pendingPay });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/rooms', protect, async (req, res) => {
  try {
    const d = req.query.to ? new Date(req.query.to) : new Date();
    const today = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); const todayE = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    const [totalRooms, occupiedRooms, availableRooms, monthBookings, checkInsToday, checkOutsToday, recentBookings] = await Promise.all([Room.countDocuments(), Room.countDocuments({ status: 'occupied' }), Room.countDocuments({ status: 'available' }), RoomBooking.countDocuments({ createdAt: { $gte: new Date(d.getFullYear(), d.getMonth(), 1) }, status: { $ne: 'cancelled' } }), RoomBooking.find({ checkIn: { $gte: today, $lte: todayE }, status: { $in: ['confirmed', 'checked_in'] } }).populate('room', 'roomNumber roomType'), RoomBooking.find({ checkOut: { $gte: today, $lte: todayE }, status: 'checked_in' }).populate('room', 'roomNumber roomType'), RoomBooking.find().sort('-createdAt').limit(8).populate('room', 'roomNumber roomType').populate('createdBy', 'name').populate('checkedInBy', 'name').populate('checkedOutBy', 'name'),]);
    res.json({ totalRooms, occupiedRooms, availableRooms, occupancyRate: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0, monthBookings, checkInsToday: checkInsToday.length, checkOutsToday: checkOutsToday.length, checkInsList: checkInsToday, checkOutsList: checkOutsToday, recentBookings });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/accounts', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const [monthly, pnl, pendingPaymentsPO] = await Promise.all([
      getMonthly(from, to), getPnL(from, to),
      PO.find({ paymentStatus: { $in: ['pending', 'advance'] } }).populate('vendor', 'name').sort('-createdAt').limit(10),
    ]);
    res.json({ monthly, pnl, pendingPaymentsPO });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/hr', protect, async (req, res) => {
  try {
    const [total, active, inactive, byDept, recentStaff] = await Promise.all([User.countDocuments(), User.countDocuments({ isActive: true }), User.countDocuments({ isActive: false }), User.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]), User.find().select('-password').sort('-createdAt').limit(8),]);
    res.json({ stats: { total, active, inactive }, byDept, recentStaff });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/director', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { startDate, endDate } = parseDateRange(from, to);
    const committee = req.user.department;

    const COMMITTEE_DEPTS = {
      food_committee: ['kitchen', 'bar', 'banquet'],
      sports:         ['sports'],
      rooms_banquets: ['rooms', 'banquet'],
      general:        null,
    };
    const depts = COMMITTEE_DEPTS[committee] ?? null;
    const dateFilter = { date: { $gte: startDate, $lte: endDate } };
    const matchFilter = depts ? { ...dateFilter, department: { $in: depts } } : dateFilter;
    const reqFilter   = depts ? { department: { $in: depts } } : {};

    const [salesAgg, expAgg, recentRequests] = await Promise.all([
      Sale.aggregate([{ $match: matchFilter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, t: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: matchFilter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, t: { $sum: '$amount' } } }]),
      PReq.find(reqFilter).sort('-createdAt').limit(10).populate('requestedBy', 'name').populate('approvedBy', 'name role'),
    ]);

    const salesMap = salesAgg.reduce((a, c) => ({ ...a, [c._id]: c.t }), {});
    const expMap   = expAgg.reduce((a, c) => ({ ...a, [c._id]: c.t }), {});
    const monthly  = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const ds = cur.toISOString().split('T')[0];
      const s = salesMap[ds] || 0, e = expMap[ds] || 0;
      monthly.push({ month: new Date(cur).toLocaleDateString('default', { month: 'short', day: 'numeric' }), sales: s, expenses: e, profit: s - e });
      cur.setDate(cur.getDate() + 1);
    }

    const totalSales    = salesAgg.reduce((s, x) => s + x.t, 0);
    const totalExpenses = expAgg.reduce((s, x) => s + x.t, 0);

    let deptBreakdown = [];
    if (!depts) {
      const [sA, eA] = await Promise.all([
        Sale.aggregate([{ $match: dateFilter }, { $group: { _id: '$department', s: { $sum: '$amount' } } }]),
        Expense.aggregate([{ $match: dateFilter }, { $group: { _id: '$department', e: { $sum: '$amount' } } }]),
      ]);
      const allDepts = [...new Set([...sA.map(x => x._id), ...eA.map(x => x._id)])];
      deptBreakdown = allDepts.map(d => ({ department: d, sales: sA.find(x => x._id === d)?.s || 0, expenses: eA.find(x => x._id === d)?.e || 0, profit: (sA.find(x => x._id === d)?.s || 0) - (eA.find(x => x._id === d)?.e || 0) }));
    }

    res.json({ totalSales, totalExpenses, totalProfit: totalSales - totalExpenses, monthly, recentRequests, deptBreakdown, committee, departments: depts });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/department/:dept', protect, async (req, res) => {
  try {
    const dept = req.params.dept;
    let deptQuery = dept;
    if (dept === 'food_committee') deptQuery = { $in: ['kitchen', 'bar', 'restaurant', 'food_committee'] };
    else if (dept === 'rooms_banquets') deptQuery = { $in: ['rooms', 'banquet', 'rooms_banquets'] };
    else if (dept === 'general') deptQuery = { $in: ['management', 'procurement', 'store', 'accounts', 'hr', 'maintenance', 'general'] };

    const { from, to } = req.query;
    const { startDate, endDate } = parseDateRange(from, to);
    const monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    const [[s], [e], reqs, items, monthly] = await Promise.all([
      Sale.aggregate([{ $match: { department: deptQuery, date: { $gte: monthStart, $lte: endDate } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { department: deptQuery, date: { $gte: monthStart, $lte: endDate } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
      PReq.find({ department: deptQuery }).sort('-createdAt').limit(5).populate('requestedBy', 'name').populate('approvedBy', 'name role'),
      Item.find({ department: deptQuery, isActive: true }).sort('quantity').limit(10),
      (async () => {
        const [sales, expenses] = await Promise.all([
          Sale.aggregate([{ $match: { department: deptQuery, date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, t: { $sum: '$amount' } } }]),
          Expense.aggregate([{ $match: { department: deptQuery, date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, t: { $sum: '$amount' } } }]),
        ]);
        const salesMap   = sales.reduce((a, c) => ({ ...a, [c._id]: c.t }), {});
        const expenseMap = expenses.reduce((a, c) => ({ ...a, [c._id]: c.t }), {});
        const ms = [];
        const cur = new Date(startDate);
        while (cur <= endDate) {
          const dateStr = cur.toISOString().split('T')[0];
          const sv = salesMap[dateStr] || 0, ev = expenseMap[dateStr] || 0;
          ms.push({ month: new Date(cur).toLocaleDateString('default', { month: 'short', day: 'numeric' }), sales: sv, expenses: ev, profit: sv - ev });
          cur.setDate(cur.getDate() + 1);
        }
        return ms;
      })(),
    ]);
    res.json({ monthlySales: s?.t || 0, monthlyExpenses: e?.t || 0, monthlyProfit: (s?.t || 0) - (e?.t || 0), recentRequests: reqs, items, monthly });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
