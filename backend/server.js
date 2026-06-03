require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gymapp-secret-change-this';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hegelmann2025';

// DB setup
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'gym.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

app.use(cors());
app.use(express.json());

// Serve frontend in production
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
}

// Auth middleware
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ user: 'hegelmann' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

// Get all workouts
app.get('/api/workouts', auth, (req, res) => {
  const rows = db.prepare('SELECT date, data, updated_at FROM workouts ORDER BY date').all();
  const result = {};
  rows.forEach(r => { result[r.date] = JSON.parse(r.data); });
  res.json(result);
});

// Get single workout
app.get('/api/workouts/:date', auth, (req, res) => {
  const row = db.prepare('SELECT data FROM workouts WHERE date = ?').get(req.params.date);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(row.data));
});

// Save workout
app.put('/api/workouts/:date', auth, (req, res) => {
  const { date } = req.params;
  const data = JSON.stringify(req.body);
  db.prepare(`
    INSERT INTO workouts (date, data, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(date, data);
  res.json({ ok: true });
});

// Delete workout
app.delete('/api/workouts/:date', auth, (req, res) => {
  db.prepare('DELETE FROM workouts WHERE date = ?').run(req.params.date);
  res.json({ ok: true });
});

// Fallback to frontend
app.get('*', (req, res) => {
  if (fs.existsSync(frontendBuild)) {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  } else {
    res.json({ status: 'API running' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
