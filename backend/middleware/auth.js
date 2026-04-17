const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
  try {
    const { id } = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(id).select('-password');
    if (!req.user || !req.user.isActive) return res.status(401).json({ message: 'Account inactive or not found' });
    next();
  } catch (e) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: `Access denied for role: ${req.user.role}` });
  next();
};

module.exports = { protect, allow };
