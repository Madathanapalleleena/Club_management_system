const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const mkToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });
    user.lastLogin = new Date(); await user.save();
    res.json({ token: mkToken(user._id), user });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/me', protect, (req, res) => res.json(req.user));

router.get('/users', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.role) f.role = req.query.role;
    if (req.query.department) f.department = req.query.department;
    if (req.query.isActive !== undefined) f.isActive = req.query.isActive !== 'false';
    const users = await User.find(f).select('-password').populate('createdBy', 'name role').sort('name');
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users', protect, async (req, res) => {
  try {
    const ok = ['chairman','secretary','gm','agm','hr_manager','store_manager'];
    if (!ok.includes(req.user.role)) return res.status(403).json({ message: 'Not authorised' });
    if (req.user.role === 'store_manager' && req.body.role !== 'store_assistant') return res.status(403).json({ message: 'Can only create store assistants' });
    const exists = await User.findOne({ email: req.body.email?.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/users/:id', protect, async (req, res) => {
  try {
    const ok = ['chairman','secretary','gm','agm','hr_manager','store_manager'];
    if (!ok.includes(req.user.role)) return res.status(403).json({ message: 'Not authorised' });
    const { password, ...data } = req.body;
    if (req.user.role === 'store_manager') {
       const u = await User.findById(req.params.id);
       if (u.role !== 'store_assistant') return res.status(403).json({ message: 'Not authorised to edit this user' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { ...data, updatedBy: req.user._id }, { new: true }).select('-password');
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/users/:id/toggle', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    
    const ok = ['chairman','secretary','gm','agm','hr_manager','store_manager'];
    if (!ok.includes(req.user.role)) return res.status(403).json({ message: 'Not authorised' });
    if (req.user.role === 'store_manager' && user.role !== 'store_assistant') return res.status(403).json({ message: 'Not authorised' });

    user.isActive = !user.isActive; user.updatedBy = req.user._id;
    await user.save(); res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(req.body.currentPassword))) return res.status(400).json({ message: 'Incorrect current password' });
    user.password = req.body.newPassword; await user.save();
    res.json({ message: 'Password updated' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
