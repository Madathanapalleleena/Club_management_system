const mongoose = require('mongoose');

const changeLog = new mongoose.Schema({
  action:      String,
  note:        String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
}, { _id: true });

const schema = new mongoose.Schema({
  bookingRef:        { type: String, unique: true },

  // Booking details
  banquetType:       { type: String, required: true, enum: ['Small Hall','Medium Hall','Large Hall','Outdoor','Rooftop','Conference Room'] },
  eventType:         { type: String, required: true, enum: ['Wedding','Birthday','Corporate','Reception','Anniversary','Engagement','Conference','Other'] },
  bookingDate:       { type: Date, required: true },
  slot:              { type: String, required: true, enum: ['morning','afternoon','evening'] },
  slotStart:         { type: String },
  slotEnd:           { type: String },
  numberOfPersons:   { type: Number, required: true, min: 1 },

  // Pricing engine (all auto-calculated on save)
  pricePerBuffet:    { type: Number, required: true, default: 0, min: 0 },
  buffetCost:        { type: Number, default: 0 },
  banquetCharges:    { type: Number, default: 0, min: 0 },
  gstRate:           { type: Number, default: 0, enum: [0, 5, 10, 12, 18] },
  taxAmount:         { type: Number, default: 0 },
  totalAmount:       { type: Number, default: 0 },

  // Payment
  advancePayment:    { type: Number, default: 0, min: 0 },
  balanceAmount:     { type: Number, default: 0 },
  paymentStatus:     { type: String, default: 'due', enum: ['due','partial','paid'] },
  paymentMode:       { type: String, enum: ['cash','upi','card','online','cheque'] },
  paymentUpdatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentUpdatedAt:  { type: Date },

  // Customer
  customerName:      { type: String, required: true, trim: true },
  customerMobile:    { type: String, required: true, match: [/^\d{10}$/, 'Mobile must be 10 digits'] },
  customerEmail:     { type: String, lowercase: true },
  memberId:          { type: String },
  customerAddress:   { type: String },

  // Booking person (can differ from customer)
  bookingPersonName: { type: String },

  // Status & tracking
  status:            { type: String, default: 'confirmed', enum: ['confirmed','completed','cancelled'] },
  notes:             { type: String },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Notification flags
  reminderDays: [Number],    // tracks which day-before reminders were sent (3,2,1)
  paymentAlertDates: [Date], // tracks dates payment alerts were sent

  // PDF
  invoicePath:       { type: String },

  changeLog:         [changeLog],
}, { timestamps: true });

// Auto ref & pricing calculation
schema.pre('save', async function (next) {
  if (this.isNew && !this.bookingRef) {
    const count = await this.constructor.countDocuments();
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    this.bookingRef = `BNQ-${String(count + 1).padStart(4, '0')}/${mm}/${yy}`;
  }

  // Set slot times
  const slotMap = {
    morning:   { start: '07:00', end: '12:00' },
    afternoon: { start: '12:00', end: '17:00' },
    evening:   { start: '17:00', end: '23:00' },
  };
  if (this.slot && slotMap[this.slot]) {
    this.slotStart = slotMap[this.slot].start;
    this.slotEnd   = slotMap[this.slot].end;
  }

  // Pricing engine
  this.buffetCost   = (this.numberOfPersons || 0) * (this.pricePerBuffet || 0);
  this.taxAmount    = Math.round(((this.buffetCost + (this.banquetCharges || 0)) * (this.gstRate || 0)) / 100 * 100) / 100;
  this.totalAmount  = Math.round((this.buffetCost + (this.banquetCharges || 0) + this.taxAmount) * 100) / 100;
  this.balanceAmount = Math.max(0, Math.round((this.totalAmount - (this.advancePayment || 0)) * 100) / 100);

  next();
});

module.exports = mongoose.model('BanquetBooking', schema);
