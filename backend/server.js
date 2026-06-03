require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gymapp-secret-change-this';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hegelmann2025';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workouts (
      date TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS day_types (
      date TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

app.use(cors());
app.use(express.json());

const frontendBuild = path.join(__dirname, 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
}

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

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ user: 'hegelmann' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

app.get('/api/workouts', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT date, data FROM workouts ORDER BY date');
    const workouts = {};
    result.rows.forEach(r => { workouts[r.date] = r.data; });
    res.json(workouts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/workouts/:date', auth, async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO workouts (date, data, updated_at) VALUES ($1, $2, NOW())
      ON CONFLICT (date) DO UPDATE SET data = $2, updated_at = NOW()
    `, [req.params.date, req.body]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/workouts/:date', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM workouts WHERE date = $1', [req.params.date]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/daytypes', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT date, type FROM day_types');
    const types = {};
    result.rows.forEach(r => { types[r.date] = r.type; });
    res.json(types);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/daytypes/:date', auth, async (req, res) => {
  try {
    const { type } = req.body;
    await pool.query(`
      INSERT INTO day_types (date, type, updated_at) VALUES ($1, $2, NOW())
      ON CONFLICT (date) DO UPDATE SET type = $2, updated_at = NOW()
    `, [req.params.date, type]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  if (fs.existsSync(frontendBuild)) {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  } else {
    res.json({ status: 'API running' });
  }
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(e => {
  console.error('DB init failed:', e);
  process.exit(1);
});
