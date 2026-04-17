const router  = require('express').Router();
const multer  = require('multer');
const { Item, StockTxn, GRC, InternalRequest } = require('../models/StoreModels');
const PO      = require('../models/PurchaseOrder');
const PReq    = require('../models/ProcurementRequest');
const Notif   = require('../models/Notification');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.diskStorage({ destination:'uploads/', filename:(r,f,cb)=>cb(null,`${Date.now()}-${f.originalname}`) }), limits: { fileSize: 20*1024*1024 } });

router.get('/summary', protect, async (req, res) => {
  try {
    const all = await Item.find({ isActive: true });
    res.json({
      total: all.length,
      adequate: all.filter(i => i.stockStatus === 'adequate').length,
      low: all.filter(i => i.stockStatus === 'low').length,
      critical: all.filter(i => i.stockStatus === 'critical').length,
      outOfStock: all.filter(i => i.stockStatus === 'out_of_stock').length,
      expiringSoon: all.filter(i => { if (!i.expiryDate) return false; const d = (new Date(i.expiryDate) - Date.now()) / 86400000; return d > 0 && d <= 50; }).length,
      totalValue: all.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Items
router.get('/items', protect, async (req, res) => {
  try {
    const f = { isActive: true };
    if (req.query.category) f.category = req.query.category;
    if (req.query.type) f.itemType = req.query.type;
    if (req.query.department) f.department = req.query.department;
    if (req.query.search) f.name = { $regex: req.query.search, $options: 'i' };
    if (req.query.lowStock === 'true') { const all = await Item.find({ isActive: true }); return res.json(all.filter(i => ['low','critical','out_of_stock'].includes(i.stockStatus))); }
    if (req.query.expiringSoon === 'true') { f.expiryDate = { $lte: new Date(Date.now() + 50*86400000), $gte: new Date() }; }
    res.json(await Item.find(f).populate('createdBy','name').populate('lastUpdatedBy','name').sort('name'));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/items/:id', protect, async (req, res) => {
  try { res.json(await Item.findById(req.params.id).populate('createdBy','name').populate('lastUpdatedBy','name')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/items', protect, async (req, res) => {
  try {
    const item = await Item.create({ ...req.body, createdBy: req.user._id });
    if (item.quantity > 0) await StockTxn.create({ item: item._id, type: 'initial', quantity: item.quantity, previousQty: 0, newQty: item.quantity, performedBy: req.user._id });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/items/:id', protect, async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, { ...req.body, lastUpdatedBy: req.user._id }, { new: true });
    if (['critical','out_of_stock'].includes(item.stockStatus))
      await Notif.notifyRoles(['store_manager','store_assistant'], '⚠️ Low Stock', `${item.name}: ${item.quantity} ${item.unit} (${item.stockStatus})`, 'alert', item._id, 'store');
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/items/:id', protect, async (req, res) => {
  try { await Item.findByIdAndUpdate(req.params.id, { isActive: false, lastUpdatedBy: req.user._id }); res.json({ message: 'Deactivated' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/items/:id/adjust', protect, async (req, res) => {
  try {
    const { type, quantity, notes, linkedPO, linkedRequest } = req.body;
    const item = await Item.findById(req.params.id);
    const prev = item.quantity; const qty = Number(quantity);
    if (['add','return','purchase'].includes(type)) item.quantity += qty;
    else if (['deduction','write_off'].includes(type)) item.quantity = Math.max(0, item.quantity - qty);
    else if (type === 'adjustment') item.quantity = qty;
    item.lastUpdatedBy = req.user._id;
    if (type === 'purchase') item.lastPurchased = new Date();
    await item.save();
    await StockTxn.create({ item: item._id, type, quantity: qty, previousQty: prev, newQty: item.quantity, notes, performedBy: req.user._id, linkedPO, linkedRequest });
    if (['critical','out_of_stock'].includes(item.stockStatus))
      await Notif.notifyRoles(['store_manager','store_assistant'], '⚠️ Critical Stock', `${item.name}: ${item.quantity} ${item.unit}`, 'alert', item._id, 'store');
    if (item.expiryDate) {
      const dLeft = Math.floor((new Date(item.expiryDate) - Date.now()) / 86400000);
      if (dLeft > 0 && dLeft <= 50) await Notif.notifyRoles(['store_manager','store_assistant'], '⏰ Expiry Alert', `${item.name} expires in ${dLeft} days`, 'warning', item._id, 'store');
    }
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/items/:id/transactions', protect, async (req, res) => {
  try { res.json(await StockTxn.find({ item: req.params.id }).populate('performedBy','name role').populate('linkedPO','poNumber').sort('-createdAt').limit(100)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/categories', protect, async (req, res) => {
  try { res.json(await Item.distinct('category', { isActive: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// GRC
router.get('/grc', protect, async (req, res) => {
  try {
    const grcs = await GRC.find()
      .populate('receivedBy','name role').populate('verifiedByStore','name role')
      .populate('verifiedByAccounts','name role').populate('verifiedByProcurement','name role')
      .populate('verifiedByHOD','name role').populate('linkedPO','poNumber department')
      .sort('-createdAt');
    res.json(grcs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/grc', protect, upload.fields([{ name:'grcFile' },{ name:'billFile' }]), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const grc = await GRC.create({ ...data, receivedBy: req.user._id, grcFilePath: req.files?.grcFile?.[0]?.path, billPath: req.files?.billFile?.[0]?.path, billFileName: req.files?.billFile?.[0]?.originalname });
    if (grc.linkedPO) { const po = await PO.findById(grc.linkedPO); if (po) { po.grcUploaded = true; po.grcUploadedBy = req.user._id; if (grc.billPath) { po.billUploaded = true; po.billUploadedBy = req.user._id; po.billUploadedAt = new Date(); po.billPath = grc.billPath; } po.changeLog.push({ action:'grc_uploaded', note:`GRC by ${req.user.name}`, performedBy:req.user._id }); await po.save(); } }
    await Notif.notifyRoles(['store_manager','accounts_manager','procurement_manager','gm'], '📦 GRC Uploaded', `PO ${grc.poNumber} — 4-party verify required`, 'info', grc._id, 'store');
    res.status(201).json(grc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/grc/:id/verify', protect, async (req, res) => {
  try {
    const grc = await GRC.findById(req.params.id); const r = req.user.role; const now = new Date();
    if (['store_manager','store_assistant'].includes(r)) { grc.verifiedByStore = req.user._id; grc.verifiedByStoreAt = now; }
    else if (r === 'accounts_manager') { grc.verifiedByAccounts = req.user._id; grc.verifiedByAccountsAt = now; }
    else if (['procurement_manager','procurement_assistant'].includes(r)) { grc.verifiedByProcurement = req.user._id; grc.verifiedByProcurementAt = now; }
    else if (['gm','agm','chairman','secretary'].includes(r)) { grc.verifiedByHOD = req.user._id; grc.verifiedByHODAt = now; }
    if (grc.verifiedByStore && grc.verifiedByAccounts && grc.verifiedByProcurement) grc.status = 'completed';
    await grc.save(); res.json(grc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Internal Requests
router.get('/internal-requests', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.status) f.status = req.query.status;
    if (req.query.department) f.department = req.query.department;
    const deptOnly = ['kitchen_manager','food_control','bar_manager','banquet_manager','rooms_manager','sports_manager','maintenance_manager'];
    if (deptOnly.includes(req.user.role)) f.requestedBy = req.user._id;
    const reqs = await InternalRequest.find(f)
      .populate('requestedBy','name role department')
      .populate('approvedBy','name role')
      .populate('issuedBy','name role')
      .populate('items.itemId','name quantity unit stockStatus')
      .populate('returnedItems.returnedBy','name')
      .populate('changeLog.performedBy','name role')
      .sort('-createdAt');
    res.json(reqs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/internal-requests/:id', protect, async (req, res) => {
  try {
    const r = await InternalRequest.findById(req.params.id)
      .populate('requestedBy','name role department email')
      .populate('approvedBy','name role')
      .populate('issuedBy','name role')
      .populate('items.itemId','name quantity unit unitPrice stockStatus')
      .populate('returnedItems.returnedBy','name role')
      .populate('changeLog.performedBy','name role');
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/internal-requests', protect, async (req, res) => {
  try {
    const ir = await InternalRequest.create({ ...req.body, requestedBy: req.user._id });
    await Notif.notifyRoles(['store_manager','store_assistant'], '📋 Internal Request', `${ir.requestNumber} from ${req.user.name} (${req.body.department}) — ${ir.items.length} items`, 'info', ir._id, 'store');
    res.status(201).json(ir);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/internal-requests/:id', protect, async (req, res) => {
  try {
    const ir = await InternalRequest.findById(req.params.id).populate('requestedBy','_id name');
    const { action, note, itemUpdates, returnedItems, ...data } = req.body;
    const log = { performedBy: req.user._id, performedAt: new Date() };

    if (action === 'approve') {
      ir.status = 'approved'; ir.approvedBy = req.user._id; ir.approvedAt = new Date();
      log.action = 'approved'; log.note = `Approved by ${req.user.name}`;
      await Notif.notifyUser(ir.requestedBy._id, '✅ Request Approved', `${ir.requestNumber} approved by ${req.user.name}`, 'success', ir._id, 'store');
    } else if (action === 'reject') {
      ir.status = 'rejected'; ir.approvedBy = req.user._id;
      log.action = 'rejected'; log.note = note || `Rejected by ${req.user.name}`;
      await Notif.notifyUser(ir.requestedBy._id, '❌ Request Rejected', `${ir.requestNumber} rejected by ${req.user.name}`, 'alert', ir._id, 'store');
    } else if (action === 'partial_approve' && itemUpdates) {
      ir.status = 'partially_approved'; ir.approvedBy = req.user._id; ir.approvedAt = new Date();
      ir.items = ir.items.map(it => { const u = itemUpdates.find(x => x._id === it._id?.toString()); return u ? { ...it.toObject(), approvedQty: u.approvedQty, itemStatus: 'approved' } : it; });
      log.action = 'partially_approved'; log.note = `Partially approved by ${req.user.name}`;
      await Notif.notifyUser(ir.requestedBy._id, '⚠️ Partially Approved', `${ir.requestNumber} — some quantities adjusted by ${req.user.name}`, 'warning', ir._id, 'store');
    } else if (action === 'issue') {
      ir.status = 'issued'; ir.issuedBy = req.user._id; ir.issuedAt = new Date();
      for (const it of ir.items) {
        if (it.itemId) {
          const item = await Item.findById(it.itemId);
          if (item) {
            const prev = item.quantity; const issueQty = it.approvedQty || it.quantity;
            item.quantity = Math.max(0, item.quantity - issueQty);
            item.lastUpdatedBy = req.user._id; await item.save();
            await StockTxn.create({ item: item._id, type: 'deduction', quantity: issueQty, previousQty: prev, newQty: item.quantity, performedBy: req.user._id, linkedRequest: ir._id, notes: `Issued for ${ir.requestNumber}` });
            if (['critical','out_of_stock'].includes(item.stockStatus)) await Notif.notifyRoles(['store_manager','store_assistant'], '⚠️ Low After Issuance', `${item.name}: ${item.quantity} ${item.unit}`, 'alert', item._id, 'store');
          }
        }
      }
      log.action = 'issued'; log.note = `Items issued by ${req.user.name}`;
      await Notif.notifyUser(ir.requestedBy._id, '📦 Items Issued', `${ir.requestNumber} fulfilled by ${req.user.name}`, 'success', ir._id, 'store');
    } else if (action === 'flag_missing') {
      ir.missingItemsFlag = true; log.action = 'missing_flagged'; log.note = `Missing items flagged by ${req.user.name}`;
      await Notif.notifyRoles(['procurement_manager','gm'], '🔴 Missing Items', `${ir.requestNumber} — items not in stock`, 'alert', ir._id, 'store');
    }

    if (returnedItems?.length > 0) {
      for (const ret of returnedItems) {
        if (ret.itemId && ret.quantity > 0) {
          const item = await Item.findById(ret.itemId);
          if (item) { const prev = item.quantity; item.quantity += Number(ret.quantity); item.lastUpdatedBy = req.user._id; await item.save(); await StockTxn.create({ item: item._id, type: 'return', quantity: ret.quantity, previousQty: prev, newQty: item.quantity, performedBy: req.user._id, linkedRequest: ir._id }); }
        }
      }
      ir.returnedItems.push(...returnedItems.map(r => ({ ...r, returnedBy: req.user._id, returnedAt: new Date() })));
      log.action = log.action || 'return_processed';
      log.note   = (log.note ? log.note + ' | ' : '') + `Returns by ${req.user.name}`;
    }

    if (note && !log.action) { log.action = 'note'; log.note = note; }
    if (log.action) ir.changeLog.push(log);
    if (data.notes) ir.notes = data.notes;
    await ir.save(); res.json(ir);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/order-tracking', protect, async (req, res) => {
  try {
    const orders = await PO.find({ orderStatus: { $ne: 'cancelled' } })
      .populate('vendor','name shopName').populate('createdBy','name role')
      .populate('approvedBy','name role').populate('deliveryUpdatedBy','name role')
      .select('poNumber department vendor orderStatus paymentStatus totalAmount expectedDelivery actualDelivery billUploaded grcUploaded createdBy approvedBy deliveryUpdatedBy items createdAt')
      .sort('-createdAt').limit(100);
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/edit-po/:id', protect, async (req, res) => {
  try {
    const po = await PO.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    po.items = req.body.items;
    po.totalAmount = po.items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    po.changeLog.push({ action: 'items_edited', note: `Items updated by ${req.user.name} (Store)`, performedBy: req.user._id });
    await po.save();
    await Notif.notifyRoles(['procurement_manager','accounts_manager'], 'PO Items Updated', `${po.poNumber} modified by ${req.user.name}`, 'warning', po._id, 'store');
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
