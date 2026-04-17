const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || '/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'romchi.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('worker','employer')),
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  specs TEXT NOT NULL,
  experience TEXT NOT NULL,
  about TEXT DEFAULT '',
  rating REAL DEFAULT 0,
  jobs_done INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  top INTEGER DEFAULT 0,
  lat REAL,
  lng REAL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  type TEXT NOT NULL,
  work_type TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  experience TEXT NOT NULL,
  salary_from INTEGER NOT NULL,
  salary_to INTEGER NOT NULL,
  specs TEXT NOT NULL,
  description TEXT DEFAULT '',
  badge TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
`);

// Migrations for existing DBs created before lat/lng columns
const migrate = (sql) => { try { db.exec(sql); } catch {} };
migrate('ALTER TABLE workers ADD COLUMN lat REAL');
migrate('ALTER TABLE workers ADD COLUMN lng REAL');
migrate('ALTER TABLE workers ADD COLUMN telegram TEXT');
migrate('ALTER TABLE workers ADD COLUMN salary_from INTEGER');
migrate('ALTER TABLE workers ADD COLUMN salary_to INTEGER');
migrate('ALTER TABLE jobs ADD COLUMN lat REAL');
migrate('ALTER TABLE jobs ADD COLUMN lng REAL');

module.exports = db;
