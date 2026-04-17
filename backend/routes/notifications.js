const router = require('express').Router();
const Notif  = require('../models/Notification');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const docs = await Notif.find({ recipients: req.user._id }).sort('-createdAt').limit(60);
    res.json(docs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notif.countDocuments({ recipients: req.user._id, readBy: { $ne: req.user._id } });
    res.json({ count });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/read', protect, async (req, res) => {
  try { await Notif.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/read-all', protect, async (req, res) => {
  try { await Notif.updateMany({ recipients: req.user._id }, { $addToSet: { readBy: req.user._id } }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
