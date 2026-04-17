const mongoose = require('mongoose');

// ── Room ──────────────────────────────────────────────────────────
const roomSchema = new mongoose.Schema({
  roomNumber:     { type: String, required: true, unique: true, trim: true },
  roomType:       { type: String, required: true, enum: ['Standard','Deluxe','Suite','Family Room','Executive','Presidential Suite'] },
  pricePerNight:  { type: Number, required: true, min: 0 },
  capacity:       { type: Number, default: 2, min: 1 },
  floor:          { type: String },
  amenities:      [{ type: String }],
  status:         { type: String, enum: ['available','occupied','maintenance','reserved'], default: 'available' },
  description:    { type: String },
  images:         [{ type: String }],
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Room Booking ──────────────────────────────────────────────────
const changeLog = new mongoose.Schema({
  action:      String,
  note:        String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
}, { _id: true });

const bookingSchema = new mongoose.Schema({
  bookingRef:       { type: String, unique: true },

  // Room info
  room:             { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  roomType:         { type: String },
  roomNumber:       { type: String },

  // Stay details
  checkIn:          { type: Date, required: true },
  checkOut:         { type: Date, required: true },
  numberOfNights:   { type: Number, default: 1, min: 1 },
  adults:           { type: Number, default: 1, min: 1 },
  children:         { type: Number, default: 0, min: 0 },

  // Pricing
  pricePerNight:    { type: Number, required: true },
  roomCost:         { type: Number, default: 0 },
  extraBedCharges:  { type: Number, default: 0 },
  foodCharges:      { type: Number, default: 0 },
  serviceCharges:   { type: Number, default: 0 },
  discountAmount:   { type: Number, default: 0 },
  couponCode:       { type: String },
  gstRate:          { type: Number, default: 12, enum: [0, 5, 12, 18] },
  taxAmount:        { type: Number, default: 0 },
  totalAmount:      { type: Number, default: 0 },

  // Payment
  advancePayment:   { type: Number, default: 0 },
  balanceAmount:    { type: Number, default: 0 },
  paymentMode:      { type: String, enum: ['cash','upi','card','online'], default: 'cash' },
  paymentStatus:    { type: String, enum: ['due','partial','paid'], default: 'due' },
  paymentUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentUpdatedAt: { type: Date },

  // Customer (ID proof mandatory)
  customerName:     { type: String, required: true, trim: true },
  customerMobile:   { type: String, required: true, match: [/^\d{10}$/, 'Mobile must be 10 digits'] },
  customerEmail:    { type: String, lowercase: true },
  idProofType:      { type: String, required: true, enum: ['Aadhar','Passport','Driving License','Voter ID','PAN Card'] },
  idProofNumber:    { type: String, required: true },
  customerAddress:  { type: String },
  memberId:         { type: String },

  // Status
  status:           { type: String, default: 'confirmed', enum: ['confirmed','checked_in','checked_out','cancelled','no_show'] },
  notes:            { type: String },
  invoicePath:      { type: String },

  // Who did what
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkedInBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkedInAt:      { type: Date },
  checkedOutBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkedOutAt:     { type: Date },

  changeLog:        [changeLog],
}, { timestamps: true });

// Auto ref & pricing
bookingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bookingRef) {
    const count = await this.constructor.countDocuments();
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    this.bookingRef = `RMS-${String(count + 1).padStart(4, '0')}/${mm}/${yy}`;
  }
  const ci = new Date(this.checkIn);
  const co = new Date(this.checkOut);
  this.numberOfNights = Math.max(1, Math.ceil((co - ci) / 86400000));
  this.roomCost = Math.round(this.pricePerNight * this.numberOfNights * 100) / 100;
  const extras = (this.extraBedCharges || 0) + (this.foodCharges || 0) + (this.serviceCharges || 0);
  const subTotal = Math.max(0, this.roomCost + extras - (this.discountAmount || 0));
  this.taxAmount = Math.round((subTotal * (this.gstRate || 0) / 100) * 100) / 100;
  this.totalAmount = Math.round((subTotal + this.taxAmount) * 100) / 100;
  this.balanceAmount = Math.max(0, Math.round((this.totalAmount - (this.advancePayment || 0)) * 100) / 100);
  next();
});

module.exports = {
  Room:        mongoose.model('Room', roomSchema),
  RoomBooking: mongoose.model('RoomBooking', bookingSchema),
};
