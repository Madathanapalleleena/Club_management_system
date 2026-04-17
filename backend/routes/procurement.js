const router   = require('express').Router();
const multer   = require('multer');
const PReq     = require('../models/ProcurementRequest');
const PO       = require('../models/PurchaseOrder');
const { Vendor, AgreementTemplate } = require('../models/Vendor');
const { GRC }  = require('../models/StoreModels');
const Notif    = require('../models/Notification');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({ destination: 'uploads/', filename: (req, f, cb) => cb(null, `${Date.now()}-${f.originalname}`) });
const upload  = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const PROC = ['procurement_manager','procurement_assistant','gm','agm','chairman','secretary'];

// ── SECTION 1: REQUIREMENT PLANNING ──────────────────────────────
router.get('/requests', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.status)     f.status     = req.query.status;
    if (req.query.department) f.department = req.query.department;
    if (req.query.priority)   f.priority   = req.query.priority;
    if (!PROC.includes(req.user.role)) f.requestedBy = req.user._id;
    const docs = await PReq.find(f)
      .populate('requestedBy','name role department')
      .populate('approvedBy','name role')
      .populate('rejectedBy','name role')
      .populate('changeLog.performedBy','name role')
      .sort('-createdAt');
    res.json(docs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/requests/:id', protect, async (req, res) => {
  try {
    const r = await PReq.findById(req.params.id)
      .populate('requestedBy','name role department email mobile')
      .populate('approvedBy','name role')
      .populate('rejectedBy','name role')
      .populate('linkedPO')
      .populate('changeLog.performedBy','name role');
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/requests', protect, async (req, res) => {
  try {
    const r = await PReq.create({ ...req.body, requestedBy: req.user._id });
    await Notif.notifyRoles(['procurement_manager','gm'], 'New Procurement Request', `${r.requestNumber} from ${req.user.name} (${r.department}) — ${r.items.length} item(s), ${r.priority} priority`, 'info', r._id, 'procurement');
    res.status(201).json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/requests/:id', protect, async (req, res) => {
  try {
    const r = await PReq.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    const { action, note, ...data } = req.body;
    const log = { performedBy: req.user._id, performedAt: new Date() };

    if (action === 'approve') {
      r.status = 'approved'; r.approvedBy = req.user._id; r.approvedAt = new Date();
      log.action = 'approved'; log.note = `Approved by ${req.user.name}`;
      await Notif.notifyUser(r.requestedBy, 'Request Approved ✅', `${r.requestNumber} approved by ${req.user.name}`, 'success', r._id, 'procurement');
    } else if (action === 'reject') {
      r.status = 'rejected'; r.rejectedBy = req.user._id; r.rejectedAt = new Date();
      log.action = 'rejected'; log.note = note || `Rejected by ${req.user.name}`;
      await Notif.notifyUser(r.requestedBy, 'Request Rejected ❌', `${r.requestNumber} rejected by ${req.user.name}${note ? ': ' + note : ''}`, 'alert', r._id, 'procurement');
    } else if (note) {
      log.action = 'note'; log.note = note;
    } else if (data.items) {
      log.action = 'items_edited'; log.note = `Items updated by ${req.user.name}`;
    }
    if (log.action) r.changeLog.push(log);
    Object.assign(r, data);
    await r.save();
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/requests/:id', protect, async (req, res) => {
  try { await PReq.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ── SECTION 2: VENDOR MANAGEMENT ─────────────────────────────────
router.get('/vendors', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.vendorType) f.vendorType = req.query.vendorType;
    if (req.query.category)   f.category   = req.query.category;
    if (req.query.isActive !== undefined) f.isActive = req.query.isActive !== 'false';
    const vendors = await Vendor.find(f)
      .populate('createdBy','name role')
      .populate('updatedBy','name role')
      .populate('agreementVersions.createdBy','name')
      .sort('shopName');
    res.json(vendors);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/vendors/:id', protect, async (req, res) => {
  try {
    const v = await Vendor.findById(req.params.id)
      .populate('createdBy','name role')
      .populate('agreementVersions.createdBy','name')
      .populate('agreementVersions.templateId','name');
    res.json(v);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/vendors/:id/analytics', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.period || '30');
    const from = new Date(Date.now() - days * 86400000);
    const orders = await PO.find({ vendor: req.params.id, createdAt: { $gte: from } })
      .populate('createdBy','name').populate('approvedBy','name').populate('paymentUpdatedBy','name').sort('-createdAt');
    res.json({
      totalOrders:  orders.length,
      totalValue:   orders.reduce((s, o) => s + (o.totalAmount || 0), 0),
      returns:      orders.filter(o => o.items?.some(i => (i.missedQty || 0) > 0)).length,
      paid:         orders.filter(o => o.paymentStatus === 'paid').length,
      pending:      orders.filter(o => o.paymentStatus === 'pending').length,
      advance:      orders.filter(o => o.paymentStatus === 'advance').length,
      stopped:      orders.filter(o => o.paymentStatus === 'stopped').length,
      delivered:    orders.filter(o => o.orderStatus === 'delivered').length,
      orders,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/vendors', protect, async (req, res) => {
  try { res.status(201).json(await Vendor.create({ ...req.body, createdBy: req.user._id })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/vendors/:id', protect, async (req, res) => {
  try { res.json(await Vendor.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// Add new agreement version
router.post('/vendors/:id/agreement', protect, upload.single('file'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    const nextVer = (vendor.currentAgreementVersion || 0) + 1;
    vendor.agreementVersions.push({
      version:    nextVer,
      content:    req.body.content,
      templateId: req.body.templateId || undefined,
      filePath:   req.file?.path,
      fileName:   req.file?.originalname,
      notes:      req.body.notes,
      createdBy:  req.user._id,
    });
    vendor.currentAgreementVersion = nextVer;
    vendor.updatedBy = req.user._id;
    await vendor.save();
    res.json(vendor);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Agreement templates
router.get('/agreement-templates', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.vendorType) f.vendorType = { $in: [req.query.vendorType, 'all'] };
    const templates = await AgreementTemplate.find(f).populate('createdBy','name').sort('name');
    res.json(templates);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/agreement-templates/:id', protect, async (req, res) => {
  try { res.json(await AgreementTemplate.findById(req.params.id)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/agreement-templates', protect, async (req, res) => {
  try { res.status(201).json(await AgreementTemplate.create({ ...req.body, createdBy: req.user._id })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/agreement-templates/:id', protect, async (req, res) => {
  try { res.json(await AgreementTemplate.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// Suggest templates based on products/vendor type
router.post('/suggest-template', protect, async (req, res) => {
  try {
    const { products = [], vendorType, category } = req.body;
    const templates = await AgreementTemplate.find({
      $or: [
        { vendorType },
        { vendorType: 'all' },
        { products: { $in: products } },
        { categories: category },
      ]
    });
    res.json(templates);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Auto-fill template with vendor data
router.post('/fill-template', protect, async (req, res) => {
  try {
    const { templateId, vendorId } = req.body;
    const [template, vendor] = await Promise.all([
      AgreementTemplate.findById(templateId),
      Vendor.findById(vendorId),
    ]);
    if (!template || !vendor) return res.status(404).json({ message: 'Template or vendor not found' });
    let filled = template.content;
    filled = filled.replace(/\{\{VENDOR_NAME\}\}/g, vendor.name);
    filled = filled.replace(/\{\{SHOP_NAME\}\}/g, vendor.shopName);
    filled = filled.replace(/\{\{VENDOR_TYPE\}\}/g, vendor.vendorType);
    filled = filled.replace(/\{\{VENDOR_ADDRESS\}\}/g, vendor.address || '');
    filled = filled.replace(/\{\{VENDOR_GST\}\}/g, vendor.gstNumber || 'N/A');
    filled = filled.replace(/\{\{PRODUCTS\}\}/g, (vendor.products || []).join(', '));
    filled = filled.replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('en-IN'));
    res.json({ filled, template, vendor });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── SECTION 3: PURCHASE ORDERS ────────────────────────────────────
router.get('/purchase-orders', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.department)    f.department    = req.query.department;
    if (req.query.orderStatus)   f.orderStatus   = req.query.orderStatus;
    if (req.query.paymentStatus) f.paymentStatus = req.query.paymentStatus;
    if (req.query.vendor)        f.vendor        = req.query.vendor;
    if (req.query.from)          f.createdAt = { ...f.createdAt, $gte: new Date(req.query.from) };
    if (req.query.to)            f.createdAt = { ...f.createdAt, $lte: new Date(req.query.to) };
    const orders = await PO.find(f)
      .populate('vendor','name shopName vendorType')
      .populate('createdBy','name role')
      .populate('approvedBy','name role')
      .populate('paymentUpdatedBy','name role')
      .populate('deliveryUpdatedBy','name role')
      .populate('billUploadedBy','name role')
      .populate('grcUploadedBy','name role')
      .populate('linkedRequest','requestNumber department')
      .populate('changeLog.performedBy','name role')
      .sort('-createdAt');
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/purchase-orders/:id', protect, async (req, res) => {
  try {
    const po = await PO.findById(req.params.id)
      .populate('vendor')
      .populate('createdBy','name role email mobile')
      .populate('approvedBy','name role')
      .populate('paymentUpdatedBy','name role')
      .populate('deliveryUpdatedBy','name role')
      .populate('billUploadedBy','name role')
      .populate('grcUploadedBy','name role')
      .populate('linkedRequest')
      .populate('changeLog.performedBy','name role');
    if (!po) return res.status(404).json({ message: 'PO not found' });
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/purchase-orders', protect, async (req, res) => {
  try {
    const po = await PO.create({ ...req.body, createdBy: req.user._id });
    if (po.linkedRequest) {
      const r = await PReq.findById(po.linkedRequest);
      if (r) { r.status = 'po_raised'; r.linkedPO = po._id; r.changeLog.push({ action:'po_raised', note:`PO ${po.poNumber} created by ${req.user.name}`, performedBy: req.user._id }); await r.save(); }
    }
    await Notif.notifyRoles(['gm','chairman','secretary','accounts_manager'], 'Purchase Order Created', `${po.poNumber} — ${po.department}, ${po.items.length} items, ₹${po.totalAmount}`, 'info', po._id, 'procurement');
    res.status(201).json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/purchase-orders/:id', protect, async (req, res) => {
  try {
    const po = await PO.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    const { action, note, ...data } = req.body;
    const log = { performedBy: req.user._id, performedAt: new Date() };

    if (action === 'approve') {
      po.orderStatus = 'approved'; po.approvedBy = req.user._id; po.approvedAt = new Date();
      log.action = 'approved'; log.note = `Approved by ${req.user.name}`;
    } else if (action === 'dispatch') {
      po.orderStatus = 'dispatched'; log.action = 'dispatched'; log.note = `Dispatched — by ${req.user.name}`;
    } else if (action === 'deliver') {
      po.orderStatus = 'delivered'; po.actualDelivery = new Date(); log.action = 'delivered'; log.note = `Delivered — by ${req.user.name}`;
    } else if (action === 'cancel') {
      po.orderStatus = 'cancelled'; log.action = 'cancelled'; log.note = note || `Cancelled by ${req.user.name}`;
    } else if (action === 'update_payment') {
      // 3.1 — Accounts updates payment
      po.paymentStatus    = data.paymentStatus;
      po.advanceAmount    = data.advanceAmount !== undefined ? data.advanceAmount : po.advanceAmount;
      po.balanceAmount    = Math.max(0, po.totalAmount - po.advanceAmount);
      po.paymentUpdatedBy = req.user._id;
      po.paymentUpdatedAt = new Date();
      log.action = 'payment_updated'; log.note = `Payment: ${data.paymentStatus}, advance ₹${po.advanceAmount} — by ${req.user.name}`;
      await Notif.notifyRoles(['procurement_manager','gm'], 'PO Payment Updated', `${po.poNumber} — ${data.paymentStatus} by ${req.user.name}`, 'info', po._id, 'procurement');
    } else if (action === 'update_delivery_date') {
      po.expectedDelivery   = data.expectedDelivery;
      po.deliveryUpdatedBy  = req.user._id;
      log.action = 'delivery_date_set'; log.note = `Delivery date: ${data.expectedDelivery} — by ${req.user.name}`;
    } else if (note) {
      log.action = 'note'; log.note = note;
    }

    if (log.action) po.changeLog.push(log);
    if (data.items) { po.items = data.items; }
    if (data.expectedDelivery) po.expectedDelivery = data.expectedDelivery;
    await po.save();
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Upload bill — 5.2 (store uploads, notifies accounts)
router.post('/purchase-orders/:id/bill', protect, upload.single('bill'), async (req, res) => {
  try {
    const po = await PO.findById(req.params.id);
    po.billUploaded   = true;
    po.billPath       = req.file?.path;
    po.billFileName   = req.file?.originalname;
    po.billUploadedBy = req.user._id;
    po.billUploadedAt = new Date();
    if (req.body.totalBillAmount) po.totalAmount = parseFloat(req.body.totalBillAmount);
    po.changeLog.push({ action: 'bill_uploaded', note: `Bill uploaded by ${req.user.name}`, performedBy: req.user._id });
    await po.save();
    await Notif.notifyRoles(['accounts_manager','procurement_manager','gm'], 'Bill Uploaded', `${po.poNumber} — bill uploaded by ${req.user.name}`, 'info', po._id, 'procurement');
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── SECTION 4: ORDER TRACKING ─────────────────────────────────────
router.get('/order-tracking', protect, async (req, res) => {
  try {
    const f = { orderStatus: { $ne: 'cancelled' } };
    if (req.query.department)  f.department  = req.query.department;
    if (req.query.orderStatus) f.orderStatus = req.query.orderStatus;
    const orders = await PO.find(f)
      .populate('vendor','name shopName')
      .populate('createdBy','name role')
      .populate('approvedBy','name role')
      .populate('deliveryUpdatedBy','name role')
      .populate('paymentUpdatedBy','name role')
      .select('poNumber department vendor orderStatus paymentStatus totalAmount expectedDelivery actualDelivery billUploaded grcUploaded createdBy approvedBy deliveryUpdatedBy paymentUpdatedBy items createdAt')
      .sort('-createdAt');
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/order-tracking/:id/delivery', protect, async (req, res) => {
  try {
    const po = await PO.findById(req.params.id);
    po.expectedDelivery  = req.body.expectedDelivery;
    po.deliveryUpdatedBy = req.user._id;
    po.changeLog.push({ action: 'delivery_date_set', note: `Delivery: ${req.body.expectedDelivery} — by ${req.user.name}`, performedBy: req.user._id });
    await po.save();
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── SECTION 5: QUALITY & COMPLIANCE ─────────────────────────────
router.get('/grc', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.status) f.status = req.query.status;
    const grcs = await GRC.find(f)
      .populate('receivedBy','name role')
      .populate('verifiedByStore','name role')
      .populate('verifiedByAccounts','name role')
      .populate('verifiedByProcurement','name role')
      .populate('verifiedByHOD','name role')
      .populate('linkedPO','poNumber department totalAmount')
      .sort('-createdAt');
    res.json(grcs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/grc', protect, upload.fields([{ name: 'grcFile' }, { name: 'billFile' }]), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const grc = await GRC.create({
      ...data, receivedBy: req.user._id,
      grcFilePath: req.files?.grcFile?.[0]?.path,
      billPath:    req.files?.billFile?.[0]?.path,
      billFileName:req.files?.billFile?.[0]?.originalname,
    });
    if (grc.linkedPO) {
      const po = await PO.findById(grc.linkedPO);
      if (po) {
        po.grcUploaded   = true; po.grcUploadedBy = req.user._id;
        if (grc.billPath) { po.billUploaded = true; po.billUploadedBy = req.user._id; po.billUploadedAt = new Date(); po.billPath = grc.billPath; }
        po.changeLog.push({ action: 'grc_uploaded', note: `GRC uploaded by ${req.user.name}`, performedBy: req.user._id });
        await po.save();
      }
    }
    await Notif.notifyRoles(['store_manager','accounts_manager','procurement_manager','gm'], 'GRC Uploaded — Verify Required', `PO ${grc.poNumber} — 4-party verification needed`, 'info', grc._id, 'store');
    res.status(201).json(grc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/grc/:id/verify', protect, async (req, res) => {
  try {
    const grc = await GRC.findById(req.params.id);
    const r = req.user.role; const now = new Date();
    if (['store_manager','store_assistant'].includes(r))           { grc.verifiedByStore = req.user._id; grc.verifiedByStoreAt = now; }
    else if (r === 'accounts_manager')                             { grc.verifiedByAccounts = req.user._id; grc.verifiedByAccountsAt = now; }
    else if (['procurement_manager','procurement_assistant'].includes(r)) { grc.verifiedByProcurement = req.user._id; grc.verifiedByProcurementAt = now; }
    else if (['gm','agm','chairman','secretary'].includes(r))      { grc.verifiedByHOD = req.user._id; grc.verifiedByHODAt = now; }
    if (grc.verifiedByStore && grc.verifiedByAccounts && grc.verifiedByProcurement) grc.status = 'completed';
    await grc.save();
    res.json(grc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Dashboard stats for procurement
router.get('/stats', protect, async (req, res) => {
  try {
    const [pReqPending, pReqApproved, vendorCount, poPending, poDelivered, poPayPending, grcPending, recentPOs, recentReqs] = await Promise.all([
      PReq.countDocuments({ status: 'pending' }),
      PReq.countDocuments({ status: 'approved' }),
      Vendor.countDocuments({ isActive: true }),
      PO.countDocuments({ orderStatus: { $in: ['draft','approved','dispatched'] } }),
      PO.countDocuments({ orderStatus: 'delivered' }),
      PO.countDocuments({ paymentStatus: { $in: ['pending','advance'] } }),
      GRC.countDocuments({ status: 'pending' }),
      PO.find().sort('-createdAt').limit(8).populate('vendor','name shopName').populate('createdBy','name').populate('approvedBy','name').populate('paymentUpdatedBy','name'),
      PReq.find().sort('-createdAt').limit(8).populate('requestedBy','name department').populate('approvedBy','name'),
    ]);
    res.json({ pReqPending, pReqApproved, vendorCount, poPending, poDelivered, poPayPending, grcPending, recentPOs, recentReqs });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
