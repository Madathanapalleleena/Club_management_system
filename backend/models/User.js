const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const ROLES = [
  'chairman','secretary','gm','agm','director',
  'procurement_manager','procurement_assistant',
  'store_manager','store_assistant',
  'kitchen_manager','food_control',
  'banquet_manager','rooms_manager','bar_manager',
  'sports_manager','hr_manager','accounts_manager',
  'maintenance_manager','staff',
];

const schema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true, minlength: 6 },
  role:       { type: String, enum: ROLES, required: true },
  department: { type: String, trim: true },
  memberId:   { type: String, sparse: true, unique: true },
  mobile:     { type: String, trim: true },
  isActive:   { type: Boolean, default: true },
  lastLogin:  { type: Date },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
schema.methods.matchPassword = function (p) { return bcrypt.compare(p, this.password); };
schema.methods.toJSON = function () { const o = this.toObject(); delete o.password; return o; };

module.exports = mongoose.model('User', schema);
module.exports.ROLES = ROLES;
