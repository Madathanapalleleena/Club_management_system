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

router.post('/', protect, allow('chairman','secretary'), async (req, res) => {
  try { res.status(201).json(await Director.create({ ...req.body, createdBy: req.user._id })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', protect, allow('chairman','secretary'), async (req, res) => {
  try { res.json(await Director.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true })); }
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
