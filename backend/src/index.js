'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createAuth, SqliteStore } = require('express-jwt-refresh');
const { DatabaseSync } = require('node:sqlite');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-32-chars-min';

const authDbPath = path.join(__dirname, '..', 'data');
fs.mkdirSync(authDbPath, { recursive: true });
const authDb = new DatabaseSync(path.join(authDbPath, 'auth.db'));
const auth = createAuth({
  secret: JWT_SECRET,
  store: new SqliteStore(authDb),
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ---------- auth ----------
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const hash = await auth.hashPassword(password);
    const r = db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)').run(email, hash, Date.now());
    const user = { id: r.lastInsertRowid, email };
    res.status(201).json(await auth.login(res, user));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered.' });
    throw e;
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !(await auth.verifyPassword(password, row.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json(await auth.login(res, { id: row.id, email: row.email }));
});

app.post('/api/refresh', auth.refresh);
app.post('/api/logout', auth.logout);
app.get('/api/me', auth.middleware, (req, res) => {
  const row = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: row });
});

// ---------- items (protected CRUD example) ----------
app.get('/api/items', auth.middleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM items WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ items: rows });
});

app.post('/api/items', auth.middleware, (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required.' });
  const r = db.prepare('INSERT INTO items (user_id, title, created_at) VALUES (?, ?, ?)').run(req.user.id, title, Date.now());
  res.status(201).json({ item: db.prepare('SELECT * FROM items WHERE id = ?').get(r.lastInsertRowid) });
});

app.delete('/api/items/:id', auth.middleware, (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- serve frontend in production ----------
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found.' });
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`bienvenue-mtl running on http://localhost:${PORT}`));
