const mongoose = require('mongoose');

const agreementVersionSchema = new mongoose.Schema({
  version:    { type: Number, required: true },
  content:    { type: String },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementTemplate' },
  filePath:   { type: String },
  fileName:   { type: String },
  notes:      { type: String },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const vendorSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  shopName:    { type: String, required: true, trim: true },
  address:     { type: String, required: true },
  mobile:      { type: String },
  email:       { type: String, lowercase: true },
  gstNumber:   { type: String },
  vendorType:  { type: String, enum: ['wholesale','retailer','distributor'], required: true },
  category:    { type: String, required: true },
  products:    [{ type: String, trim: true }],
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  isActive:    { type: Boolean, default: true },
  agreementVersions:       [agreementVersionSchema],
  currentAgreementVersion: { type: Number, default: 0 },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const templateSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  vendorType:   { type: String, enum: ['wholesale','retailer','distributor','all'], default: 'all' },
  categories:   [String],
  products:     [String],
  content:      { type: String, required: true },
  placeholders: [String],
  isDefault:    { type: Boolean, default: false },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = {
  Vendor:            mongoose.model('Vendor', vendorSchema),
  AgreementTemplate: mongoose.model('AgreementTemplate', templateSchema),
};
