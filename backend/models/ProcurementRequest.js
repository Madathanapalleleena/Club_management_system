const mongoose = require('mongoose');

const changeLog = new mongoose.Schema({
  action:      { type: String },
  field:       { type: String },
  fromValue:   { type: String },
  toValue:     { type: String },
  note:        { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedAt: { type: Date, default: Date.now },
}, { _id: true });

const itemLine = new mongoose.Schema({
  itemName:       { type: String, required: true, trim: true },
  category:       { type: String },
  quantity:       { type: Number, required: true, min: 0 },
  unit:           { type: String, default: 'kg' },
  estimatedPrice: { type: Number, default: 0 },
  notes:          { type: String },
});

const schema = new mongoose.Schema({
  requestNumber:  { type: String, unique: true },
  department:     { type: String, required: true },
  requestedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:          [itemLine],
  budgetEstimate: { type: Number, default: 0 },
  priority:       { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  status:         { type: String, enum: ['pending','approved','rejected','po_raised','completed'], default: 'pending' },
  approvedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:     { type: Date },
  rejectedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt:     { type: Date },
  linkedPO:       { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  notes:          { type: String },
  changeLog:      [changeLog],
}, { timestamps: true });

schema.pre('save', async function (next) {
  if (this.isNew && !this.requestNumber) {
    const d    = new Date();
    const code = (this.department || 'GEN').slice(0, 3).toUpperCase();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const count = await this.constructor.countDocuments({ department: this.department });
    this.requestNumber = `REQ-${code}${String(count + 1).padStart(3, '0')}/${mm}/${yyyy}`;
  }
  next();
});

module.exports = mongoose.model('ProcurementRequest', schema);
