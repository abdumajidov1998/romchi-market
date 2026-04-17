const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

const q = (text, params) => pool.query(text, params);

async function init() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('worker','employer','waste_buyer')),
      created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    );

    CREATE TABLE IF NOT EXISTS workers (
      id SERIAL PRIMARY KEY,
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
      telegram TEXT,
      salary_from INTEGER,
      salary_to INTEGER,
      created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    );

    CREATE TABLE IF NOT EXISTS waste_buyers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      about TEXT DEFAULT '',
      price_termo INTEGER DEFAULT 0,
      price_pvx_oq INTEGER DEFAULT 0,
      price_pvx_rangli INTEGER DEFAULT 0,
      price_alyumin INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      verified INTEGER DEFAULT 0,
      top INTEGER DEFAULT 0,
      lat REAL,
      lng REAL,
      telegram TEXT,
      created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
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
      lat REAL,
      lng REAL,
      created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    );
  `);
}

module.exports = { q, init, pool };
