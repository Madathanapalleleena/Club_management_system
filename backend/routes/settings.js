const router       = require('express').Router();
const multer       = require('multer');
const path         = require('path');
const ClubSettings = require('../models/ClubSettings');
const { protect }  = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, f, cb) => cb(null, `logo-${Date.now()}${path.extname(f.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, f, cb) => cb(null, f.mimetype.startsWith('image/')) });

async function getSettings() {
  let s = await ClubSettings.findOne();
  if (!s) s = await ClubSettings.create({});
  return s;
}

router.get('/', protect, async (req, res) => {
  try { res.json(await getSettings()); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/', protect, async (req, res) => {
  try {
    if (!['gm','chairman','secretary'].includes(req.user.role))
      return res.status(403).json({ message: 'Only GM / Chairman can update settings' });
    let s = await ClubSettings.findOne();
    if (!s) s = new ClubSettings();
    Object.assign(s, req.body, { updatedBy: req.user._id });
    await s.save();
    res.json(s);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/logo', protect, upload.single('logo'), async (req, res) => {
  try {
    if (!['gm','chairman','secretary'].includes(req.user.role))
      return res.status(403).json({ message: 'Only GM / Chairman can upload logo' });
    let s = await ClubSettings.findOne();
    if (!s) s = new ClubSettings();
    s.logoPath  = req.file?.path || s.logoPath;
    s.updatedBy = req.user._id;
    await s.save();
    res.json({ logoPath: s.logoPath });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = { router, getSettings };
