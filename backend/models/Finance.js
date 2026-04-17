const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  department:    { type: String, required: true },
  category:      { type: String, required: true },
  date:          { type: Date, required: true },
  amount:        { type: Number, required: true, min: 0 },
  description:   { type: String },
  invoiceNumber: { type: String },
  paymentMode:   { type: String, enum: ['cash','card','upi','credit'], default: 'cash' },
  recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const expenseSchema = new mongoose.Schema({
  department:   { type: String, required: true },
  category:     { type: String, required: true },
  date:         { type: Date, required: true },
  amount:       { type: Number, required: true, min: 0 },
  description:  { type: String },
  expenseType:  { type: String, enum: ['purchase','salary','maintenance','utilities','other'], default: 'purchase' },
  linkedPO:     { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = {
  Sale:    mongoose.model('Sale', saleSchema),
  Expense: mongoose.model('Expense', expenseSchema),
};
