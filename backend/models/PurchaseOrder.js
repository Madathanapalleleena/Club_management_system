const mongoose = require('mongoose');

const changeLog = new mongoose.Schema({
  action:      { type: String },
  note:        { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedAt: { type: Date, default: Date.now },
}, { _id: true });

const poItem = new mongoose.Schema({
  itemName:    { type: String, required: true },
  category:    { type: String },
  quantity:    { type: Number, required: true, min: 0 },
  unit:        { type: String, default: 'kg' },
  unitPrice:   { type: Number, default: 0 },
  totalPrice:  { type: Number, default: 0 },
  receivedQty: { type: Number, default: 0 },
  missedQty:   { type: Number, default: 0 },
  itemStatus:  { type: String, enum: ['pending','received','partial','missed'], default: 'pending' },
  notes:       { type: String },
});

const schema = new mongoose.Schema({
  poNumber:           { type: String, unique: true },
  department:         { type: String, required: true },
  vendor:             { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  linkedRequest:      { type: mongoose.Schema.Types.ObjectId, ref: 'ProcurementRequest' },
  items:              [poItem],
  totalAmount:        { type: Number, default: 0 },

  // Payment (updated by Accounts) — 3.1
  paymentStatus:      { type: String, enum: ['pending','advance','paid','stopped'], default: 'pending' },
  advanceAmount:      { type: Number, default: 0 },
  balanceAmount:      { type: Number, default: 0 },
  paymentUpdatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentUpdatedAt:   { type: Date },

  // Order lifecycle — 4.1
  orderStatus:        { type: String, enum: ['draft','approved','dispatched','delivered','cancelled'], default: 'draft' },
  approvedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:         { type: Date },
  expectedDelivery:   { type: Date },
  actualDelivery:     { type: Date },
  deliveryUpdatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Quality & compliance — 5.1, 5.2
  billUploaded:       { type: Boolean, default: false },
  billPath:           { type: String },
  billFileName:       { type: String },
  billUploadedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  billUploadedAt:     { type: Date },
  grcUploaded:        { type: Boolean, default: false },
  grcPath:            { type: String },
  grcUploadedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qualityCheckDone:   { type: Boolean, default: false },
  qualityNotes:       { type: String },

  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changeLog:          [changeLog],
}, { timestamps: true });

// Auto PO number: PO-NO-Kit005/03/2026
schema.pre('save', async function (next) {
  if (this.isNew && !this.poNumber) {
    const deptMap = {
      kitchen:'Kit', bar:'Bar', restaurant:'Rst', rooms:'Rms',
      banquet:'Bnq', sports:'Spt', store:'Str', maintenance:'Mnt',
      procurement:'Pro', hr:'HR', accounts:'Acc', management:'Mgmt',
    };
    const code  = deptMap[this.department] || this.department.slice(0, 3);
    const d     = new Date();
    const mm    = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy  = d.getFullYear();
    const count = await this.constructor.countDocuments({ department: this.department });
    this.poNumber = `PO-NO-${code}${String(count + 1).padStart(3, '0')}/${mm}/${yyyy}`;
  }
  this.totalAmount  = this.items.reduce((s, i) => s + (i.totalPrice || 0), 0);
  this.balanceAmount = Math.max(0, this.totalAmount - (this.advanceAmount || 0));
  next();
});

module.exports = mongoose.model('PurchaseOrder', schema);
