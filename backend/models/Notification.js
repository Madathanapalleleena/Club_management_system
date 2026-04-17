const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title:       { type: String, required: true },
  message:     { type: String, required: true },
  type:        { type: String, enum: ['alert','info','warning','success'], default: 'info' },
  module:      { type: String },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  recipients:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

schema.statics.notifyRoles = async function (roles, title, message, type, refId, mod) {
  const User  = require('./User');
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
  if (!users.length) return null;
  return this.create({ title, message, type: type || 'info', recipients: users.map(u => u._id), referenceId: refId, module: mod });
};

schema.statics.notifyUser = async function (userId, title, message, type, refId, mod) {
  if (!userId) return null;
  return this.create({ title, message, type: type || 'info', recipients: [userId], referenceId: refId, module: mod });
};

module.exports = mongoose.model('Notification', schema);
