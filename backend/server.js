require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Ensure upload dir exists
['uploads', 'uploads/bills', 'uploads/grc', 'uploads/agreements'].forEach(d => fs.mkdirSync(d, { recursive: true }));

require('./config/database')();
const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — allows same-origin (no Origin header), localhost dev, and any origin listed in CLIENT_URL / CLIENT_URLS (comma-separated).
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / curl / mobile
    if (process.env.NODE_ENV !== 'production') return cb(null, true); // permissive in dev
    if (allowedOrigins.length === 0) return cb(null, true); // not configured -> allow all
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000 }));
app.use(morgan('dev'));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/directors', require('./routes/directors'));
app.use('/api/procurement', require('./routes/procurement'));
app.use('/api/store', require('./routes/store'));
app.use('/api/kitchen', require('./routes/kitchen'));
app.use('/api/banquet', require('./routes/banquet'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings').router);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date(), env: process.env.NODE_ENV }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`  API ready on http://localhost:${PORT}`));
