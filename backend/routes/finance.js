// finance.js
const express = require('express');
const { Sale, Expense } = require('../models/Finance');
const PO = require('../models/PurchaseOrder');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/sales', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.department) f.department = req.query.department;
    if (req.query.from) f.date = { ...f.date, $gte: new Date(req.query.from) };
    if (req.query.to)   f.date = { ...f.date, $lte: new Date(req.query.to) };
    res.json(await Sale.find(f).populate('recordedBy','name role').sort('-date'));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/sales', protect, async (req, res) => {
  try { res.status(201).json(await Sale.create({ ...req.body, recordedBy: req.user._id })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/expenses', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.department) f.department = req.query.department;
    if (req.query.from) f.date = { ...f.date, $gte: new Date(req.query.from) };
    if (req.query.to)   f.date = { ...f.date, $lte: new Date(req.query.to) };
    res.json(await Expense.find(f).populate('recordedBy','name role').sort('-date'));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/expenses', protect, async (req, res) => {
  try { res.status(201).json(await Expense.create({ ...req.body, recordedBy: req.user._id })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/pnl', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.from) f.date = { ...f.date, $gte: new Date(req.query.from) };
    if (req.query.to)   f.date = { ...f.date, $lte: new Date(req.query.to) };
    const [sA, eA] = await Promise.all([
      Sale.aggregate([{ $match: f }, { $group: { _id: '$department', totalSales: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: f }, { $group: { _id: '$department', totalExpenses: { $sum: '$amount' } } }]),
    ]);
    const depts = [...new Set([...sA.map(s=>s._id), ...eA.map(e=>e._id)])];
    res.json(depts.map(d => ({ department:d, sales: sA.find(s=>s._id===d)?.totalSales||0, expenses: eA.find(e=>e._id===d)?.totalExpenses||0, profit: (sA.find(s=>s._id===d)?.totalSales||0)-(eA.find(e=>e._id===d)?.totalExpenses||0) })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/monthly', protect, async (req, res) => {
  try {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      const fr = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59);
      const [[s],[e]] = await Promise.all([
        Sale.aggregate([{ $match:{ date:{$gte:fr,$lte:to} } },{ $group:{_id:null,t:{$sum:'$amount'}} }]),
        Expense.aggregate([{ $match:{ date:{$gte:fr,$lte:to} } },{ $group:{_id:null,t:{$sum:'$amount'}} }]),
      ]);
      months.push({ month: fr.toLocaleString('default',{month:'short',year:'2-digit'}), sales:s?.t||0, expenses:e?.t||0, profit:(s?.t||0)-(e?.t||0) });
    }
    res.json(months);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/po-payment/:id', protect, async (req, res) => {
  try {
    const po = await PO.findById(req.params.id);
    po.paymentStatus    = req.body.paymentStatus;
    po.advanceAmount    = req.body.advanceAmount !== undefined ? req.body.advanceAmount : po.advanceAmount;
    po.balanceAmount    = Math.max(0, po.totalAmount - po.advanceAmount);
    po.paymentUpdatedBy = req.user._id;
    po.paymentUpdatedAt = new Date();
    po.changeLog.push({ action:'payment_updated', note:`Payment: ${req.body.paymentStatus} by ${req.user.name}`, performedBy: req.user._id });
    await po.save(); res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
