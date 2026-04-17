const usePg = !!process.env.DATABASE_URL;

let q, init;

if (usePg) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  q = (text, params) => pool.query(text, params);
  init = async () => {
    await q(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, phone TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS workers (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, specs TEXT NOT NULL, experience TEXT NOT NULL, about TEXT DEFAULT '', rating REAL DEFAULT 0, jobs_done INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, salary_from INTEGER, salary_to INTEGER, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS jobs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, company TEXT NOT NULL, type TEXT NOT NULL, work_type TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, experience TEXT NOT NULL, salary_from INTEGER NOT NULL, salary_to INTEGER NOT NULL, specs TEXT NOT NULL, description TEXT DEFAULT '', badge TEXT, lat REAL, lng REAL, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS waste_buyers (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', price_termo INTEGER DEFAULT 0, price_pvx_oq INTEGER DEFAULT 0, price_pvx_rangli INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, rating REAL DEFAULT 0, verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS usluga_providers (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', specs TEXT NOT NULL DEFAULT '[]', price_termo INTEGER DEFAULT 0, price_pvx INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
    `);
  };
} else {
  const Database = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, 'romchi.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS workers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, specs TEXT NOT NULL, experience TEXT NOT NULL, about TEXT DEFAULT '', rating REAL DEFAULT 0, jobs_done INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, salary_from INTEGER, salary_to INTEGER, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, company TEXT NOT NULL, type TEXT NOT NULL, work_type TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, experience TEXT NOT NULL, salary_from INTEGER NOT NULL, salary_to INTEGER NOT NULL, specs TEXT NOT NULL, description TEXT DEFAULT '', badge TEXT, lat REAL, lng REAL, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS waste_buyers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', price_termo INTEGER DEFAULT 0, price_pvx_oq INTEGER DEFAULT 0, price_pvx_rangli INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, rating REAL DEFAULT 0, verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS usluga_providers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', specs TEXT NOT NULL DEFAULT '[]', price_termo INTEGER DEFAULT 0, price_pvx INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT (strftime('%s','now')));
  `);
  q = async (text, params) => {
    let sql = text.replace(/\$\d+/g, '?').replace(/ILIKE/g, 'LIKE');
    const returning = /RETURNING\s+id/i.test(sql);
    sql = sql.replace(/\s+RETURNING\s+id/gi, '');
    const trimmed = sql.trim();
    if (/^SELECT|^WITH/i.test(trimmed)) return { rows: db.prepare(trimmed).all(...(params || [])) };
    if (/^INSERT/i.test(trimmed)) { const r = db.prepare(trimmed).run(...(params || [])); return { rows: returning ? [{ id: r.lastInsertRowid }] : [], rowCount: r.changes }; }
    const r = db.prepare(trimmed).run(...(params || [])); return { rows: [], rowCount: r.changes };
  };
  init = async () => {};
}

module.exports = { q, init };
