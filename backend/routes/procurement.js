const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const PDFDoc   = require('pdfkit');
const PReq     = require('../models/ProcurementRequest');
const PO       = require('../models/PurchaseOrder');
const { Vendor, AgreementTemplate } = require('../models/Vendor');
const { GRC, Item, StockTxn } = require('../models/StoreModels');
const Notif    = require('../models/Notification');
const { getSettings } = require('./settings');
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
    if (!PROC.includes(req.user.role)) {
      if (req.user.role === 'director') {
        let deptQuery = req.user.department;
        if (deptQuery === 'food_committee') deptQuery = { $in: ['kitchen', 'bar', 'restaurant', 'food_committee'] };
        else if (deptQuery === 'rooms_banquets') deptQuery = { $in: ['rooms', 'banquet', 'rooms_banquets'] };
        else if (deptQuery === 'general') deptQuery = { $in: ['management', 'procurement', 'store', 'accounts', 'hr', 'maintenance', 'general'] };
        f.department = deptQuery;
      } else {
        f.requestedBy = req.user._id;
      }
    }
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
    await Notif.notifyRoles(['procurement_manager','gm','agm'], 'New Procurement Request', `${r.requestNumber} from ${req.user.name} (${r.department}) — ${r.items.length} item(s), ${r.priority} priority`, 'info', r._id, 'procurement');
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
      if (!['gm','agm','chairman','secretary'].includes(req.user.role))
        return res.status(403).json({ message: 'Only GM or AGM can approve procurement requests' });
      r.status = 'approved'; r.approvedBy = req.user._id; r.approvedAt = new Date();
      log.action = 'approved'; log.note = `Approved by ${req.user.name} (${req.user.role})`;
      await Promise.all([
        Notif.notifyUser(r.requestedBy, 'Request Approved', `${r.requestNumber} approved by ${req.user.name}`, 'success', r._id, 'procurement'),
        Notif.notifyRoles(['store_manager','store_assistant','procurement_manager'], 'PR Approved — PO Required', `${r.requestNumber} (${r.department}) approved by ${req.user.name} — please raise a Purchase Order`, 'info', r._id, 'procurement'),
      ]);
    } else if (action === 'reject') {
      if (!['gm','agm','chairman','secretary'].includes(req.user.role))
        return res.status(403).json({ message: 'Only GM or AGM can reject procurement requests' });
      r.status = 'rejected'; r.rejectedBy = req.user._id; r.rejectedAt = new Date();
      log.action = 'rejected'; log.note = note || `Rejected by ${req.user.name}`;
      await Notif.notifyUser(r.requestedBy, 'Request Rejected', `${r.requestNumber} rejected by ${req.user.name}${note ? ': ' + note : ''}`, 'alert', r._id, 'procurement');
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
    
    // Director sees only high-value POs for their department
    if (req.user.role === 'director') {
      let deptQuery = req.user.department;
      if (deptQuery === 'food_committee') deptQuery = { $in: ['kitchen', 'bar', 'restaurant', 'food_committee'] };
      else if (deptQuery === 'rooms_banquets') deptQuery = { $in: ['rooms', 'banquet', 'rooms_banquets'] };
      else if (deptQuery === 'general') deptQuery = { $in: ['management', 'procurement', 'store', 'accounts', 'hr', 'maintenance', 'general'] };
      f.department = deptQuery;
      f.totalAmount = { $gte: 50000 };
    }
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
      .populate('hvApprovals.director.approvedBy','name role')
      .populate('hvApprovals.agm.approvedBy','name role')
      .populate('hvApprovals.gm.approvedBy','name role')
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
      .populate('changeLog.performedBy','name role')
      .populate('hvApprovals.director.approvedBy','name role')
      .populate('hvApprovals.agm.approvedBy','name role')
      .populate('hvApprovals.gm.approvedBy','name role');
    if (!po) return res.status(404).json({ message: 'PO not found' });
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/purchase-orders', protect, async (req, res) => {
  try {
    const body = { ...req.body, createdBy: req.user._id };
    // Flag high-value POs (>50,000) for multi-level approval
    const totalAmt = (req.body.items || []).reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unitPrice || 0)), 0);
    if (totalAmt > 50000) body.requiresHighValueApproval = true;

    const po = await PO.create(body);

    if (po.linkedRequest) {
      const r = await PReq.findById(po.linkedRequest);
      if (r) { r.status = 'po_raised'; r.linkedPO = po._id; r.changeLog.push({ action:'po_raised', note:`PO ${po.poNumber} created by ${req.user.name}`, performedBy: req.user._id }); await r.save(); }
    }

    if (po.requiresHighValueApproval) {
      const deptMap = { kitchen:'kitchen_manager', bar:'bar_manager', restaurant:'food_control', rooms:'rooms_manager', banquet:'banquet_manager', sports:'sports_manager', store:'store_manager', maintenance:'maintenance_manager', hr:'hr_manager', accounts:'accounts_manager' };
      const deptRole = deptMap[po.department] || null;
      const notifyRoles = ['agm', 'gm', 'chairman', 'secretary', 'accounts_manager'];
      if (deptRole) notifyRoles.push(deptRole);
      await Notif.notifyRoles(notifyRoles, '🔴 High Value PO — Multi-Level Approval Required', `${po.poNumber} ₹${po.totalAmount.toLocaleString('en-IN')} (${po.department}) requires Director + AGM + GM approval`, 'alert', po._id, 'procurement');
    } else {
      await Notif.notifyRoles(['gm','chairman','secretary','accounts_manager'], 'Purchase Order Created', `${po.poNumber} — ${po.department}, ${po.items.length} items, ₹${po.totalAmount}`, 'info', po._id, 'procurement');
    }
    res.status(201).json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/purchase-orders/:id', protect, async (req, res) => {
  try {
    const po = await PO.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    const { action, note, ...data } = req.body;
    const log = { performedBy: req.user._id, performedAt: new Date() };

    if (action === 'hv_approve') {
      // High-value PO multi-level approval (>₹50,000)
      if (!po.requiresHighValueApproval)
        return res.status(400).json({ message: 'This PO does not require high-value approval' });
      const role = req.user.role;
      if (['gm','chairman','secretary'].includes(role)) {
        po.hvApprovals.gm = { approved: true, approvedBy: req.user._id, approvedAt: new Date() };
        log.action = 'hv_gm_approved'; log.note = `GM approval by ${req.user.name}`;
      } else if (role === 'agm') {
        po.hvApprovals.agm = { approved: true, approvedBy: req.user._id, approvedAt: new Date() };
        log.action = 'hv_agm_approved'; log.note = `AGM approval by ${req.user.name}`;
      } else {
        po.hvApprovals.director = { approved: true, approvedBy: req.user._id, approvedAt: new Date() };
        log.action = 'hv_director_approved'; log.note = `Director approval by ${req.user.name}`;
      }
      po.changeLog.push({ ...log, performedBy: req.user._id, performedAt: new Date() });
      // Auto-approve when all three levels done
      if (po.hvApprovals.director?.approved && po.hvApprovals.agm?.approved && po.hvApprovals.gm?.approved) {
        po.orderStatus = 'approved'; po.approvedBy = req.user._id; po.approvedAt = new Date();
        const vendor = await Vendor.findById(po.vendor).select('shopName');
        await Promise.all([
          Notif.notifyRoles(['store_manager','store_assistant','procurement_manager','procurement_assistant'], '✅ High Value PO Fully Approved', `${po.poNumber} ₹${po.totalAmount} — all 3 approvals received`, 'success', po._id, 'procurement'),
          Notif.notifyRoles(['accounts_manager'], 'High Value PO Approved — Payment Required', `${po.poNumber} | Vendor: ${vendor?.shopName||'—'} | ₹${po.totalAmount}`, 'alert', po._id, 'procurement'),
        ]);
      }
      await po.save();
      return res.json(po);

    } else if (action === 'approve') {
      if (!['gm','agm','chairman','secretary'].includes(req.user.role))
        return res.status(403).json({ message: 'Only GM / AGM can approve a PO' });
      if (po.requiresHighValueApproval)
        return res.status(403).json({ message: 'High-value PO (>₹50,000) requires Director + AGM + GM approval via the approval chain' });
      po.orderStatus = 'approved'; po.approvedBy = req.user._id; po.approvedAt = new Date();
      log.action = 'approved'; log.note = `Approved by ${req.user.name} (${req.user.role})`;

      // Build item summary for notifications
      const itemSummary = po.items.slice(0,5).map(i=>`${i.itemName} ×${i.quantity} ${i.unit}`).join(', ') + (po.items.length>5?` +${po.items.length-5} more`:'');
      const vendor = await Vendor.findById(po.vendor).select('shopName');

      await Promise.all([
        Notif.notifyRoles(['store_manager','store_assistant'],
          'Incoming Delivery — PO Approved',
          `${po.poNumber} approved by ${req.user.name}. Vendor: ${vendor?.shopName||'—'}. Items: ${itemSummary}. Expected: ${po.expectedDelivery?new Date(po.expectedDelivery).toLocaleDateString('en-IN'):'TBD'}`,
          'info', po._id, 'procurement'),
        Notif.notifyRoles(['procurement_manager','procurement_assistant'],
          'PO Approved',
          `${po.poNumber} approved by ${req.user.name}. Total: ₹${po.totalAmount}. Items: ${itemSummary}`,
          'success', po._id, 'procurement'),
        Notif.notifyRoles(['accounts_manager'],
          'PO Approved — Payment Required',
          `${po.poNumber} | Vendor: ${vendor?.shopName||'—'} | Total: ₹${po.totalAmount} | Payment type: ${po.paymentType}`,
          po.paymentType==='advance' ? 'alert' : 'info', po._id, 'procurement'),
      ]);

      // High priority advance alert
      if (po.paymentType === 'advance' && po.advanceAmount > 0) {
        await Notif.notifyRoles(['accounts_manager'],
          '🚨 ADVANCE PAYMENT REQUIRED NOW',
          `Pay ₹${po.advanceAmount} advance immediately for ${po.poNumber} (${vendor?.shopName||'—'}) — PO just approved by ${req.user.name}`,
          'alert', po._id, 'procurement');
      }

    } else if (action === 'set_payment_plan') {
      if (req.user.role !== 'accounts_manager')
        return res.status(403).json({ message: 'Only Accounts Manager can set payment plan' });
      po.paymentType      = data.paymentType || 'full';
      po.interestRate     = parseFloat(data.interestRate) || 0;
      if (data.paymentType === 'advance') {
        po.advanceAmount  = parseFloat(data.advanceAmount) || 0;
        po.paymentStatus  = 'advance';
      }
      if (data.paymentType === 'installment' && Array.isArray(data.installments)) {
        po.installments   = data.installments;
      }
      po.paymentPlanSetBy = req.user._id;
      po.paymentPlanSetAt = new Date();
      log.action = 'payment_plan_set';
      log.note   = `Payment plan: ${data.paymentType}${data.interestRate?`, interest ${data.interestRate}%`:''}${data.advanceAmount?`, advance ₹${data.advanceAmount}`:''}${data.installments?`, ${data.installments.length} installments`:''} — by ${req.user.name}`;
      await Notif.notifyRoles(['gm','agm'],
        'Payment Plan Set — Review Needed',
        `${po.poNumber} payment plan (${data.paymentType}) set by Accounts — please review and approve PO`,
        'info', po._id, 'procurement');

    } else if (action === 'pay_installment') {
      if (req.user.role !== 'accounts_manager')
        return res.status(403).json({ message: 'Only Accounts Manager can record installment payment' });
      const inst = po.installments.id(data.installmentId);
      if (!inst) return res.status(404).json({ message: 'Installment not found' });
      if (inst.status === 'paid') return res.status(400).json({ message: 'Already paid' });
      inst.status      = 'paid';
      inst.paidOn      = new Date();
      inst.paidBy      = req.user._id;
      inst.paymentMode = data.paymentMode || 'cash';
      inst.note        = data.note || '';
      const totalPaid  = po.installments.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0);
      po.advanceAmount = totalPaid;
      po.paymentStatus = po.installments.every(i=>i.status==='paid') ? 'paid' : 'advance';
      log.action = 'installment_paid';
      log.note   = `Installment #${inst.installmentNumber} ₹${inst.amount} paid via ${inst.paymentMode} by ${req.user.name}`;
      await Notif.notifyRoles(['gm','procurement_manager'],
        'Installment Paid',
        `${po.poNumber} — Installment #${inst.installmentNumber} ₹${inst.amount} paid by Accounts`,
        'success', po._id, 'procurement');

    } else if (action === 'pay_advance') {
      if (req.user.role !== 'accounts_manager')
        return res.status(403).json({ message: 'Only Accounts Manager can record advance payment' });
      if (!po.grcUploaded && po.paymentType === 'full')
        return res.status(400).json({ message: 'GRC required before final payment' });
      po.advanceAmount    = parseFloat(data.advanceAmount) || po.advanceAmount;
      po.paymentStatus    = data.paymentStatus || 'advance';
      po.paymentMode      = data.paymentMode || po.paymentMode;
      po.paymentUpdatedBy = req.user._id;
      po.paymentUpdatedAt = new Date();
      log.action = 'advance_paid';
      log.note   = `Advance ₹${po.advanceAmount} paid via ${po.paymentMode} by ${req.user.name}`;

    } else if (action === 'mark_paid') {
      if (req.user.role !== 'accounts_manager')
        return res.status(403).json({ message: 'Only Accounts Manager can mark as paid' });
      if (!po.grcUploaded)
        return res.status(400).json({ message: 'GRC must be submitted before marking fully paid' });
      po.paymentStatus    = 'paid';
      po.paymentMode      = data.paymentMode || po.paymentMode;
      po.paymentUpdatedBy = req.user._id;
      po.paymentUpdatedAt = new Date();
      log.action = 'marked_paid';
      log.note   = `Fully paid via ${po.paymentMode} by ${req.user.name}`;
      await Notif.notifyRoles(['gm','procurement_manager','accounts_manager'],
        'PO Fully Paid',
        `${po.poNumber} — payment complete by ${req.user.name}`,
        'success', po._id, 'procurement');

    } else if (action === 'dispatch') {
      po.orderStatus = 'dispatched'; log.action = 'dispatched'; log.note = `Dispatched — by ${req.user.name}`;
    } else if (action === 'deliver') {
      po.orderStatus = 'delivered'; po.actualDelivery = new Date(); log.action = 'delivered'; log.note = `Delivered — by ${req.user.name}`;
    } else if (action === 'cancel') {
      po.orderStatus = 'cancelled'; log.action = 'cancelled'; log.note = note || `Cancelled by ${req.user.name}`;
    } else if (action === 'update_payment') {
      po.paymentStatus    = data.paymentStatus;
      po.advanceAmount    = data.advanceAmount !== undefined ? data.advanceAmount : po.advanceAmount;
      po.balanceAmount    = Math.max(0, po.totalAmount - po.advanceAmount);
      po.paymentUpdatedBy = req.user._id;
      po.paymentUpdatedAt = new Date();
      log.action = 'payment_updated'; log.note = `Payment: ${data.paymentStatus}, advance ₹${po.advanceAmount} — by ${req.user.name}`;
      await Notif.notifyRoles(['procurement_manager','gm'], 'PO Payment Updated', `${po.poNumber} — ${data.paymentStatus} by ${req.user.name}`, 'info', po._id, 'procurement');
    } else if (action === 'update_delivery_date') {
      po.expectedDelivery  = data.expectedDelivery;
      po.deliveryUpdatedBy = req.user._id;
      log.action = 'delivery_date_set'; log.note = `Delivery date: ${data.expectedDelivery} — by ${req.user.name}`;
    } else if (note) {
      log.action = 'note'; log.note = note;
    }

    if (log.action) po.changeLog.push(log);
    if (data.items) { po.items = data.items; }
    if (data.expectedDelivery && action !== 'update_delivery_date') po.expectedDelivery = data.expectedDelivery;
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
      grcFilePath:  req.files?.grcFile?.[0]?.path,
      billPath:     req.files?.billFile?.[0]?.path,
      billFileName: req.files?.billFile?.[0]?.originalname,
    });

    let po = null;
    if (grc.linkedPO) {
      po = await PO.findById(grc.linkedPO).populate('vendor','shopName name');
      if (po) {
        po.grcUploaded   = true;
        po.grcId         = grc._id;
        po.grcUploadedBy = req.user._id;
        po.grcUploadedAt = new Date();
        po.orderStatus   = 'delivered';
        po.actualDelivery= new Date();
        if (grc.billPath) { po.billUploaded = true; po.billUploadedBy = req.user._id; po.billUploadedAt = new Date(); po.billPath = grc.billPath; }
        po.changeLog.push({ action: 'grc_submitted', note: `GRC submitted by ${req.user.name} — inventory auto-updated`, performedBy: req.user._id });

        // ── AUTO-UPDATE INVENTORY immediately on GRC submission ───────
        const stockUpdates = [];
        for (const gi of grc.items) {
          if (!gi.itemId || !(gi.receivedQty > 0)) continue;
          const item = await Item.findById(gi.itemId);
          if (!item) continue;
          const prev      = item.quantity;
          item.quantity  += Number(gi.receivedQty);
          item.lastPurchased = new Date();
          item.lastUpdatedBy = req.user._id;
          await item.save();
          await StockTxn.create({
            item: item._id, type: 'purchase',
            quantity: Number(gi.receivedQty), previousQty: prev, newQty: item.quantity,
            notes: `GRC ${grc.poNumber} — received from ${po.vendor?.shopName||'vendor'}`,
            linkedPO: po._id, performedBy: req.user._id,
          });
          stockUpdates.push(`${item.name}: +${gi.receivedQty} ${item.unit}`);
        }
        await po.save();

        // ── Build ordered vs received summary ─────────────────────────
        const comparison = grc.items.map(gi => {
          const missing = (gi.orderedQty||0) - (gi.receivedQty||0);
          return `${gi.itemName}: ordered ${gi.orderedQty||0}, received ${gi.receivedQty||0}${missing>0?' ⚠ missing '+missing:''}`;
        }).join(' | ');

        const costSummary = po.items.map(i=>`${i.itemName} ×${i.quantity} @ ₹${i.unitPrice} = ₹${i.totalPrice}`).join(', ');

        await Promise.all([
          // Notify procurement: ordered vs received
          Notif.notifyRoles(['procurement_manager','procurement_assistant'],
            `GRC Received — ${po.poNumber}`,
            `${po.vendor?.shopName||'Vendor'} delivered. ${comparison}${stockUpdates.length?` | Stock updated: ${stockUpdates.join(', ')}`:''}`,
            'success', grc._id, 'store'),
          // Notify accounts: full cost details + payment ready
          Notif.notifyRoles(['accounts_manager'],
            `GRC Ready — Payment Unlocked for ${po.poNumber}`,
            `Goods received from ${po.vendor?.shopName||'vendor'}. Items: ${costSummary}. Total Bill: ₹${po.totalAmount}. Payment type: ${po.paymentType}. You can now process final payment.`,
            'alert', grc._id, 'store'),
          // Notify GM
          Notif.notifyRoles(['gm','agm'],
            `${po.poNumber} Delivered`,
            `GRC submitted by ${req.user.name}. ${comparison}`,
            'info', grc._id, 'store'),
        ]);
      }
    } else {
      await Notif.notifyRoles(['store_manager','accounts_manager','procurement_manager','gm'],
        'GRC Uploaded', `PO ${grc.poNumber} — goods received, verify required`, 'info', grc._id, 'store');
    }

    res.status(201).json(grc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/grc/:id/verify', protect, async (req, res) => {
  try {
    const grc = await GRC.findById(req.params.id);
    const r = req.user.role; const now = new Date();
    if (['store_manager','store_assistant'].includes(r))                  { grc.verifiedByStore = req.user._id; grc.verifiedByStoreAt = now; }
    else if (r === 'accounts_manager')                                    { grc.verifiedByAccounts = req.user._id; grc.verifiedByAccountsAt = now; }
    else if (['procurement_manager','procurement_assistant'].includes(r)) { grc.verifiedByProcurement = req.user._id; grc.verifiedByProcurementAt = now; }
    else if (['gm','agm','chairman','secretary'].includes(r))             { grc.verifiedByHOD = req.user._id; grc.verifiedByHODAt = now; }

    if (grc.verifiedByStore && grc.verifiedByAccounts && grc.verifiedByProcurement) grc.status = 'completed';
    await grc.save();
    res.json(grc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── SECTION 6: PO PDF GENERATION ─────────────────────────────────
router.get('/purchase-orders/:id/pdf', protect, async (req, res) => {
  try {
    const po = await PO.findById(req.params.id)
      .populate('vendor')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role');
    if (!po) return res.status(404).json({ message: 'PO not found' });

    const settings = await getSettings();
    const doc      = new PDFDoc({ margin: 50, size: 'A4' });
    const filename = `PO-${po.poNumber.replace(/\//g, '-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const pageW   = doc.page.width - 100; // usable width
    const blue    = '#1d4ed8';
    const gray    = '#6b7280';
    const darkBg  = '#1e3a5f';

    // ── Header bar ──────────────────────────────────────────────
    doc.rect(50, 45, pageW, 60).fill(darkBg);

    // Logo (if exists)
    if (settings.logoPath && fs.existsSync(settings.logoPath)) {
      try { doc.image(settings.logoPath, 60, 52, { height: 46, fit: [46, 46] }); } catch (_) {}
    }

    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
       .text(settings.clubName || 'Club Management System', 115, 58, { width: pageW - 120 });
    if (settings.address) {
      doc.fontSize(8).font('Helvetica')
         .text(`${settings.address}${settings.city ? ', ' + settings.city : ''}${settings.state ? ', ' + settings.state : ''}${settings.pincode ? ' - ' + settings.pincode : ''}`, 115, 80, { width: pageW - 120 });
    }
    if (settings.phone || settings.email) {
      doc.text(`${settings.phone ? 'Ph: ' + settings.phone : ''}  ${settings.email ? 'Email: ' + settings.email : ''}`, 115, 92, { width: pageW - 120 });
    }

    doc.moveDown(4);

    // ── Title ────────────────────────────────────────────────────
    doc.fillColor(blue).fontSize(14).font('Helvetica-Bold')
       .text('PURCHASE ORDER', { align: 'center' });
    doc.moveTo(50, doc.y + 4).lineTo(50 + pageW, doc.y + 4).strokeColor(blue).lineWidth(1.5).stroke();
    doc.moveDown(0.8);

    // ── PO meta — two columns ────────────────────────────────────
    const metaY = doc.y;
    const col1  = 50;
    const col2  = 330;

    const metaRow = (label, value, x, y) => {
      doc.fillColor(gray).fontSize(8).font('Helvetica').text(label, x, y);
      doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold').text(value || '—', x, y + 11);
    };

    metaRow('PO NUMBER',       po.poNumber,                                            col1, metaY);
    metaRow('DATE',            new Date(po.createdAt).toLocaleDateString('en-IN'),     col2, metaY);
    metaRow('DEPARTMENT',      po.department?.toUpperCase(),                           col1, metaY + 32);
    metaRow('ORDER STATUS',    po.orderStatus?.toUpperCase(),                          col2, metaY + 32);
    if (settings.gstNumber)
      metaRow('GST NUMBER',    settings.gstNumber,                                    col1, metaY + 64);
    if (po.expectedDelivery)
      metaRow('EXPECTED DELIVERY', new Date(po.expectedDelivery).toLocaleDateString('en-IN'), col2, metaY + 64);

    doc.moveDown(5.5);

    // ── Vendor box ───────────────────────────────────────────────
    const vboxY = doc.y;
    doc.rect(col1, vboxY, pageW / 2 - 10, 80).fillAndStroke('#f0f4ff', '#c7d2fe');
    doc.fillColor(blue).fontSize(9).font('Helvetica-Bold').text('VENDOR DETAILS', col1 + 8, vboxY + 8);
    doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(po.vendor?.shopName || po.vendor?.name || '—', col1 + 8, vboxY + 22);
    doc.fillColor(gray).fontSize(8).font('Helvetica');
    if (po.vendor?.address) doc.text(po.vendor.address, col1 + 8, vboxY + 36, { width: pageW / 2 - 26 });
    if (po.vendor?.phone)   doc.text(`Ph: ${po.vendor.phone}`,   col1 + 8, vboxY + 48);
    if (po.vendor?.gstNumber) doc.text(`GST: ${po.vendor.gstNumber}`, col1 + 8, vboxY + 60);

    // Approved-by box (right side)
    const abboxX = col1 + pageW / 2 + 10;
    doc.rect(abboxX, vboxY, pageW / 2 - 10, 80).fillAndStroke('#f0fff4', '#86efac');
    doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text('APPROVED BY', abboxX + 8, vboxY + 8);
    if (po.approvedBy) {
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(po.approvedBy.name, abboxX + 8, vboxY + 22);
      doc.fillColor(gray).fontSize(8).font('Helvetica').text(po.approvedBy.role?.replace(/_/g, ' ').toUpperCase(), abboxX + 8, vboxY + 36);
      if (po.approvedAt) doc.text(`Approved on: ${new Date(po.approvedAt).toLocaleString('en-IN')}`, abboxX + 8, vboxY + 48);
    } else {
      doc.fillColor('#dc2626').fontSize(9).font('Helvetica-Bold').text('PENDING APPROVAL', abboxX + 8, vboxY + 30);
    }

    doc.y = vboxY + 90;
    doc.moveDown(0.5);

    // ── Items table ──────────────────────────────────────────────
    doc.fillColor(darkBg).rect(col1, doc.y, pageW, 20).fill();
    const th = doc.y + 5;
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('#',          col1 + 4,   th, { width: 20 });
    doc.text('ITEM',       col1 + 28,  th, { width: 170 });
    doc.text('CATEGORY',   col1 + 202, th, { width: 80 });
    doc.text('QTY',        col1 + 286, th, { width: 40, align: 'right' });
    doc.text('UNIT',       col1 + 330, th, { width: 35 });
    doc.text('UNIT PRICE', col1 + 368, th, { width: 60, align: 'right' });
    doc.text('TOTAL',      col1 + 432, th, { width: 60, align: 'right' });
    doc.y += 22;

    po.items.forEach((item, i) => {
      const rowY   = doc.y;
      const isEven = i % 2 === 0;
      doc.rect(col1, rowY, pageW, 18).fill(isEven ? '#f9fafb' : '#ffffff');
      doc.fillColor('#111827').fontSize(8).font('Helvetica');
      doc.text(String(i + 1),                          col1 + 4,   rowY + 4, { width: 20 });
      doc.text(item.itemName || '—',                   col1 + 28,  rowY + 4, { width: 170 });
      doc.text(item.category || '—',                   col1 + 202, rowY + 4, { width: 80 });
      doc.text(String(item.quantity || 0),              col1 + 286, rowY + 4, { width: 40, align: 'right' });
      doc.text(item.unit || 'pcs',                      col1 + 330, rowY + 4, { width: 35 });
      doc.text(`Rs.${(item.unitPrice || 0).toFixed(2)}`,  col1 + 368, rowY + 4, { width: 60, align: 'right' });
      doc.text(`Rs.${(item.totalPrice || 0).toFixed(2)}`, col1 + 432, rowY + 4, { width: 60, align: 'right' });
      doc.y = rowY + 20;
    });

    // Table bottom border
    doc.moveTo(col1, doc.y).lineTo(col1 + pageW, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ── Totals ───────────────────────────────────────────────────
    const totalX = col1 + pageW - 200;
    const tY     = doc.y;
    doc.fillColor(gray).fontSize(9).font('Helvetica').text('Subtotal:', totalX, tY);
    doc.fillColor('#111827').font('Helvetica-Bold').text(`Rs.${po.totalAmount.toFixed(2)}`, totalX + 120, tY, { width: 80, align: 'right' });

    if (po.advanceAmount > 0) {
      doc.fillColor(gray).font('Helvetica').text('Advance Paid:', totalX, tY + 16);
      doc.fillColor('#16a34a').font('Helvetica-Bold').text(`Rs.${po.advanceAmount.toFixed(2)}`, totalX + 120, tY + 16, { width: 80, align: 'right' });
      doc.fillColor(gray).font('Helvetica').text('Balance Due:', totalX, tY + 32);
      doc.fillColor('#dc2626').font('Helvetica-Bold').text(`Rs.${po.balanceAmount.toFixed(2)}`, totalX + 120, tY + 32, { width: 80, align: 'right' });
    }

    // Grand total box
    const gtY = tY + (po.advanceAmount > 0 ? 52 : 20);
    doc.rect(totalX - 10, gtY, 210, 24).fill(darkBg);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
       .text('GRAND TOTAL', totalX, gtY + 6)
       .text(`Rs.${po.totalAmount.toFixed(2)}`, totalX + 120, gtY + 6, { width: 80, align: 'right' });

    doc.y = gtY + 40;
    doc.moveDown(1);

    // ── Signature section ────────────────────────────────────────
    const sigY  = doc.y;
    const sigW  = pageW / 3 - 10;

    const sigBlock = (label, name, role, x) => {
      doc.moveTo(x, sigY + 40).lineTo(x + sigW, sigY + 40).strokeColor('#9ca3af').lineWidth(0.8).stroke();
      doc.fillColor(gray).fontSize(7).font('Helvetica').text(label, x, sigY + 44, { width: sigW, align: 'center' });
      if (name) {
        doc.fillColor('#111827').fontSize(8).font('Helvetica-Bold').text(name, x, sigY + 56, { width: sigW, align: 'center' });
        if (role) doc.fillColor(gray).fontSize(7).font('Helvetica').text(role.replace(/_/g, ' ').toUpperCase(), x, sigY + 68, { width: sigW, align: 'center' });
      }
    };

    sigBlock('Prepared By',  po.createdBy?.name, po.createdBy?.role, col1);
    sigBlock('Authorised By', po.approvedBy?.name, po.approvedBy?.role, col1 + sigW + 15);
    sigBlock('Received By',   '', '', col1 + (sigW + 15) * 2);

    // ── Footer ───────────────────────────────────────────────────
    doc.moveDown(5);
    doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.fillColor(gray).fontSize(7).font('Helvetica')
       .text(`Generated on ${new Date().toLocaleString('en-IN')} · ${settings.clubName || 'Club Management System'}`, 50, doc.y + 6, { align: 'center', width: pageW });

    doc.end();

    // Save pdf path to PO for future reference (non-blocking)
    const pdfDir = path.join(__dirname, '../uploads/po-pdfs');
    fs.mkdirSync(pdfDir, { recursive: true });
    // We stream directly — no file saved on disk to avoid storage bloat
  } catch (e) { if (!res.headersSent) res.status(500).json({ message: e.message }); }
});

// ── SECTION 7: PAYMENT ALERTS ─────────────────────────────────────
router.post('/run-payment-alerts', protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const pos   = await PO.find({ orderStatus: { $ne: 'cancelled' }, paymentStatus: { $ne: 'paid' } });
    let alerts  = 0;

    for (const po of pos) {
      // Check overdue installments
      for (const inst of po.installments) {
        if (inst.status !== 'pending') continue;
        const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
        if (due <= today) {
          inst.status = 'overdue';
          await Notif.notifyRoles(['accounts_manager'],
            `⚠️ Installment Overdue — ${po.poNumber}`,
            `Installment #${inst.installmentNumber} of ₹${inst.amount} was due on ${due.toLocaleDateString('en-IN')} — please pay immediately`,
            'alert', po._id, 'procurement');
          alerts++;
        }
      }
      // Advance PO unpaid after approval
      if (po.paymentType === 'advance' && po.paymentStatus === 'pending' && po.orderStatus === 'approved') {
        await Notif.notifyRoles(['accounts_manager'],
          `🚨 Advance Payment Overdue — ${po.poNumber}`,
          `Advance of ₹${po.advanceAmount} not yet paid. PO was approved — pay immediately to proceed`,
          'alert', po._id, 'procurement');
        alerts++;
      }
      if (po.installments.some(i=>i.status==='overdue')) await po.save();
    }
    res.json({ alerts });
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
