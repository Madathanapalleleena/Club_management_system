const mongoose = require('mongoose');
module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  MongoDB connected');
  } catch (e) {
    console.error('❌  MongoDB error:', e.message);
    process.exit(1);
  }
};
