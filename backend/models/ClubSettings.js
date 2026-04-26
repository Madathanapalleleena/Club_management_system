const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  clubName:    { type: String, default: 'Club Management System' },
  address:     { type: String, default: '' },
  city:        { type: String, default: '' },
  state:       { type: String, default: '' },
  pincode:     { type: String, default: '' },
  phone:       { type: String, default: '' },
  email:       { type: String, default: '' },
  website:     { type: String, default: '' },
  gstNumber:   { type: String, default: '' },
  logoPath:    { type: String, default: '' },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ClubSettings', schema);
