// hr.js
const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const router  = express.Router();

router.get('/staff', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.role)       f.role       = req.query.role;
    if (req.query.department) f.department = req.query.department;
    if (req.query.isActive !== undefined) f.isActive = req.query.isActive !== 'false';
    res.json(await User.find(f).select('-password').populate('createdBy','name role').sort('name'));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.put('/staff/:id', protect, async (req, res) => {
  try {
    const ok = ['chairman','secretary','gm','agm','hr_manager'];
    if (!ok.includes(req.user.role)) return res.status(403).json({ message: 'Not authorised' });
    const { password, ...data } = req.body;
    res.json(await User.findByIdAndUpdate(req.params.id, { ...data, updatedBy: req.user._id }, { new: true }).select('-password'));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.put('/staff/:id/toggle', protect, async (req, res) => {
  try {
    const u = await User.findById(req.params.id); u.isActive = !u.isActive; u.updatedBy = req.user._id; await u.save(); res.json(u);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
