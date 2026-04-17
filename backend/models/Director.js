const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  committeeName:  { type: String, required: true, trim: true },
  name:           { type: String, required: true, trim: true },
  department:     { type: String, required: true, enum: ['food_committee','sports','rooms_banquets','general'] },
  mobile:         { type: String, required: true },
  email:          { type: String, lowercase: true, trim: true },
  memberId:       { type: String, required: true, unique: true },
  dateOfCreation: { type: Date, default: Date.now },
  isActive:       { type: Boolean, default: true },
  notes:          { type: String },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Director', schema);
