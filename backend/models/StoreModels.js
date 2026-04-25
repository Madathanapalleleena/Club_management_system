const mongoose = require('mongoose');

// ── Item ──────────────────────────────────────────────────────────
const itemSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  itemType:       { type: String, required: true },
  category:       { type: String, required: true },
  quantity:       { type: Number, default: 0, min: 0 },
  unit:           { type: String, default: 'pcs' },
  unitPrice:      { type: Number, default: 0, min: 0 },
  thresholdValue: { type: Number, default: 0, min: 0 },
  lastPurchased:  { type: Date },
  expiryDate:     { type: Date },
  department:     { type: String },
  location:       { type: String },
  stockStatus:    { type: String, enum: ['adequate','low','critical','out_of_stock'], default: 'adequate' },
  isActive:       { type: Boolean, default: true },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Recalculate stockStatus on every save so it is queryable in aggregations
itemSchema.pre('save', function (next) {
  if (this.quantity === 0)                              this.stockStatus = 'out_of_stock';
  else if (this.quantity <= this.thresholdValue * 0.5) this.stockStatus = 'critical';
  else if (this.quantity <= this.thresholdValue)        this.stockStatus = 'low';
  else                                                   this.stockStatus = 'adequate';
  next();
});

itemSchema.virtual('stockPercent').get(function () {
  if (!this.thresholdValue) return 100;
  return Math.min(100, Math.round((this.quantity / this.thresholdValue) * 100));
});

// ── Stock Transaction ─────────────────────────────────────────────
const txnSchema = new mongoose.Schema({
  item:          { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  type:          { type: String, enum: ['initial','purchase','deduction','return','adjustment','write_off'], required: true },
  quantity:      { type: Number, required: true },
  previousQty:   { type: Number },
  newQty:        { type: Number },
  unitPrice:     { type: Number },
  notes:         { type: String },
  reference:     { type: String },
  performedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  linkedPO:      { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  linkedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalRequest' },
}, { timestamps: true });

// ── GRC ───────────────────────────────────────────────────────────
const grcItemSchema = new mongoose.Schema({
  itemName:      { type: String, required: true },
  itemId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  orderedQty:    { type: Number, required: true },
  receivedQty:   { type: Number, required: true },
  missingQty:    { type: Number, default: 0 },
  mismatchNotes: { type: String },
  unitPrice:     { type: Number, default: 0 },
});

const grcSchema = new mongoose.Schema({
  poNumber:               { type: String },
  linkedPO:               { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  receivedDate:           { type: Date, default: Date.now },
  items:                  [grcItemSchema],
  totalBillAmount:        { type: Number, default: 0 },
  billPath:               { type: String },
  billFileName:           { type: String },
  grcFilePath:            { type: String },
  status:                 { type: String, enum: ['pending','partial','completed','disputed'], default: 'pending' },
  notes:                  { type: String },
  receivedBy:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verifiedByStore:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedByStoreAt:      { type: Date },
  verifiedByAccounts:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedByAccountsAt:   { type: Date },
  verifiedByProcurement:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedByProcurementAt:{ type: Date },
  verifiedByHOD:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedByHODAt:        { type: Date },
  missingItemsPRCreated:  { type: Boolean, default: false },
  missingItemsPR:         { type: mongoose.Schema.Types.ObjectId, ref: 'ProcurementRequest' },
}, { timestamps: true });

// ── InternalRequest ───────────────────────────────────────────────
const intItemSchema = new mongoose.Schema({
  itemName:    { type: String, required: true },
  itemId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  category:    { type: String },
  quantity:    { type: Number, required: true },
  unit:        { type: String },
  approvedQty: { type: Number },
  issuedQty:   { type: Number, default: 0 },
  itemStatus:  { type: String, enum: ['pending','approved','rejected','partial','issued'], default: 'pending' },
});

const returnedItemSchema = new mongoose.Schema({
  itemName:   { type: String },
  itemId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  quantity:   { type: Number, required: true },
  notes:      { type: String },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  returnedAt: { type: Date, default: Date.now },
});

const intChangeLog = new mongoose.Schema({
  action:      { type: String },
  note:        { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
}, { _id: true });

const intReqSchema = new mongoose.Schema({
  requestNumber:    { type: String, unique: true },
  requestedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department:       { type: String, required: true },
  items:            [intItemSchema],
  priority:         { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  status:           { type: String, enum: ['pending','approved','rejected','partially_approved','issued','completed'], default: 'pending' },
  approvedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:       { type: Date },
  issuedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedAt:         { type: Date },
  missingItemsFlag: { type: Boolean, default: false },
  missingItemsPR:   { type: mongoose.Schema.Types.ObjectId, ref: 'ProcurementRequest' },
  returnedItems:    [returnedItemSchema],
  notes:            { type: String },
  changeLog:        [intChangeLog],
}, { timestamps: true });

intReqSchema.pre('save', async function (next) {
  if (this.isNew && !this.requestNumber) {
    const count = await this.constructor.countDocuments();
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    this.requestNumber = `INT-${String(count + 1).padStart(4, '0')}/${mm}/${yy}`;
  }
  next();
});

module.exports = {
  Item:            mongoose.model('Item', itemSchema),
  StockTxn:        mongoose.model('StockTxn', txnSchema),
  GRC:             mongoose.model('GRC', grcSchema),
  InternalRequest: mongoose.model('InternalRequest', intReqSchema),
};
