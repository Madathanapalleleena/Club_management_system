const router = require('express').Router();
const Director = require('../models/Director');
const { protect, allow } = require('../middleware/auth');

const SUPER = ['chairman','secretary','gm','agm'];

router.get('/', protect, async (req, res) => {
  try {
    const f = {};
    if (req.query.department) f.department = req.query.department;
    if (req.query.isActive !== undefined) f.isActive = req.query.isActive !== 'false';
    const docs = await Director.find(f)
      .populate('createdBy','name role').populate('updatedBy','name role')
      .sort('-dateOfCreation');
    res.json(docs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

const User = require('../models/User');

router.post('/', protect, allow('chairman','secretary'), async (req, res) => {
  try {
    const d = await Director.create({ ...req.body, createdBy: req.user._id });
    if (req.body.email) {
      await User.create({
        name: req.body.name,
        email: req.body.email,
        password: 'Admin123',
        role: 'director',
        department: req.body.department,
        mobile: req.body.mobile,
        ...(req.body.memberId ? { memberId: req.body.memberId } : {}),
        isActive: req.body.isActive !== false
      });
    }
    res.status(201).json(d);
  }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', protect, allow('chairman','secretary'), async (req, res) => {
  try {
    const d = await Director.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id });
    if (req.body.email) {
      const u = await User.findOne({ email: req.body.email });
      if (u) {
        u.name = req.body.name;
        u.department = req.body.department;
        u.mobile = req.body.mobile;
        u.isActive = req.body.isActive !== false;
        await u.save();
      } else {
        await User.create({
          name: req.body.name,
          email: req.body.email,
          password: 'Admin123',
          role: 'director',
          department: req.body.department,
          mobile: req.body.mobile,
          ...(req.body.memberId ? { memberId: req.body.memberId } : {}),
          isActive: req.body.isActive !== false
        });
      }
    }
    res.json(await Director.findById(req.params.id));
  }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', protect, allow('chairman','secretary'), async (req, res) => {
  try {
    const d = await Director.findById(req.params.id);
    d.isActive = !d.isActive; d.updatedBy = req.user._id; await d.save();
    res.json(d);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
