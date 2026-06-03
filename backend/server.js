require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gymapp-secret-change-this';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hegelmann2025';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'workouts.json');

const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

app.get('/api/workouts', auth, (req, res) => {
  res.json(readData());
});

app.put('/api/workouts/:date', auth, (req, res) => {
  const data = readData();
  data[req.params.date] = req.body;
  writeData(data);
  res.json({ ok: true });
});

app.delete('/api/workouts/:date', auth, (req, res) => {
  const data = readData();
  delete data[req.params.date];
  writeData(data);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  if (fs.existsSync(frontendBuild)) {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  } else {
    res.json({ status: 'API running' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
