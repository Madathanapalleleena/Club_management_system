// kitchen.js
const router = require('express').Router();
const { Item, InternalRequest } = require('../models/StoreModels');
const Notif  = require('../models/Notification');
const { protect } = require('../middleware/auth');

router.get('/requests', protect, async (req, res) => {
  try {
    const f = { department: 'kitchen' };
    if (req.query.status) f.status = req.query.status;
    const docs = await InternalRequest.find(f).populate('requestedBy','name role').populate('approvedBy','name role').populate('issuedBy','name role').populate('changeLog.performedBy','name role').sort('-createdAt');
    res.json(docs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/requests', protect, async (req, res) => {
  try {
    const r = await InternalRequest.create({ ...req.body, requestedBy: req.user._id, department: 'kitchen' });
    await Notif.notifyRoles(['store_manager','store_assistant'], 'Kitchen Request', `${r.requestNumber} by ${req.user.name} — ${r.items.length} items`, 'info', r._id, 'store');
    res.status(201).json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/utilization', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.period || '30');
    const from = new Date(Date.now() - days * 86400000);
    const reqs = await InternalRequest.find({ department: 'kitchen', status: { $in:['issued','completed'] }, createdAt: { $gte: from } }).populate('items.itemId');
    const catMap = {}; const itemMap = {};
    reqs.forEach(r => r.items.forEach(i => {
      const c = i.category || (i.itemId && i.itemId.category) || 'Uncategorized';
      const uPrice = (i.itemId && i.itemId.unitPrice) || 0;
      if (!catMap[c]) catMap[c] = { category:c, quantity:0, value:0 };
      catMap[c].quantity += i.quantity; catMap[c].value += i.quantity * uPrice;
      if (!itemMap[i.itemName]) itemMap[i.itemName] = { name:i.itemName, quantity:0, value:0 };
      itemMap[i.itemName].quantity += i.quantity; itemMap[i.itemName].value += i.quantity * uPrice;
    }));
    res.json({ byCategory: Object.values(catMap).sort((a,b)=>b.value-a.value), topItems: Object.values(itemMap).sort((a,b)=>b.value-a.value).slice(0,10), totalRequests: reqs.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/returns', protect, async (req, res) => {
  try {
    for (const ret of (req.body.items || [])) {
      if (ret.itemId) { const item = await Item.findById(ret.itemId); if (item) { item.quantity += Number(ret.quantity); item.lastUpdatedBy = req.user._id; await item.save(); } }
    }
    res.json({ message: 'Returns processed' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
