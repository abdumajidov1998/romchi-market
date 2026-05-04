const usePg = !!process.env.DATABASE_URL;

let q, init;

if (usePg) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  q = (text, params) => pool.query(text, params);
  init = async () => {
    await q(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, phone TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS workers (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, specs TEXT NOT NULL, experience TEXT NOT NULL, about TEXT DEFAULT '', rating REAL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5), jobs_done INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, salary_from INTEGER, salary_to INTEGER, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS jobs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, company TEXT NOT NULL, type TEXT NOT NULL, work_type TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, experience TEXT NOT NULL, salary_from INTEGER NOT NULL, salary_to INTEGER NOT NULL, specs TEXT NOT NULL, description TEXT DEFAULT '', badge TEXT, lat REAL, lng REAL, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS waste_buyers (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', price_termo INTEGER DEFAULT 0, price_pvx_oq INTEGER DEFAULT 0, price_pvx_rangli INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, price_alikabond INTEGER DEFAULT 0, rating REAL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5), verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      ALTER TABLE waste_buyers ADD COLUMN IF NOT EXISTS price_alikabond INTEGER DEFAULT 0;
      CREATE TABLE IF NOT EXISTS usluga_providers (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', specs TEXT NOT NULL DEFAULT '[]', price_termo INTEGER DEFAULT 0, price_pvx INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, price_surma INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      CREATE TABLE IF NOT EXISTS stanok_masters (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', specs TEXT NOT NULL DEFAULT '[]', price_diagnostika INTEGER DEFAULT 0, urgent INTEGER DEFAULT 0, experience TEXT DEFAULT '', verified INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER);
      ALTER TABLE stanok_masters ADD COLUMN IF NOT EXISTS price_charxlash INTEGER DEFAULT 0;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS work_type TEXT DEFAULT '';
      CREATE TABLE IF NOT EXISTS delivery_drivers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT NOT NULL,
        vehicle_model TEXT NOT NULL,
        is_custom_vehicle INTEGER DEFAULT 0,
        vehicle_image_url TEXT,
        about TEXT DEFAULT '',
        verified INTEGER DEFAULT 0,
        lat REAL,
        lng REAL,
        telegram TEXT,
        created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
      );
      CREATE TABLE IF NOT EXISTS stanok_ads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        stanok_type TEXT,
        condition TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        description TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT NOT NULL,
        lat REAL,
        lng REAL,
        telegram TEXT,
        verified INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
      );
      CREATE TABLE IF NOT EXISTS install_brigades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT NOT NULL,
        about TEXT DEFAULT '',
        specs TEXT NOT NULL DEFAULT '[]',
        team_size INTEGER DEFAULT 1,
        experience TEXT DEFAULT '',
        price_termo INTEGER DEFAULT 0,
        price_pvx INTEGER DEFAULT 0,
        price_alyumin INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0,
        lat REAL,
        lng REAL,
        telegram TEXT,
        created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
      );
      ALTER TABLE install_brigades ADD COLUMN IF NOT EXISTS price_jp_fasad INTEGER DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_install_brigades_user_id ON install_brigades(user_id);
      CREATE INDEX IF NOT EXISTS idx_install_brigades_city ON install_brigades(city);
      CREATE TABLE IF NOT EXISTS arkachilar (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT NOT NULL,
        about TEXT DEFAULT '',
        specs TEXT NOT NULL DEFAULT '[]',
        experience TEXT DEFAULT '',
        price_termo INTEGER DEFAULT 0,
        price_pvx INTEGER DEFAULT 0,
        price_alyumin INTEGER DEFAULT 0,
        price_jp_fasad INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0,
        lat REAL,
        lng REAL,
        telegram TEXT,
        created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_arkachilar_user_id ON arkachilar(user_id);
      CREATE INDEX IF NOT EXISTS idx_arkachilar_city ON arkachilar(city);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
      CREATE INDEX IF NOT EXISTS idx_workers_city ON workers(city);
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
      CREATE INDEX IF NOT EXISTS idx_waste_buyers_user_id ON waste_buyers(user_id);
      CREATE INDEX IF NOT EXISTS idx_waste_buyers_city ON waste_buyers(city);
      CREATE INDEX IF NOT EXISTS idx_usluga_providers_user_id ON usluga_providers(user_id);
      CREATE INDEX IF NOT EXISTS idx_usluga_providers_city ON usluga_providers(city);
      CREATE INDEX IF NOT EXISTS idx_stanok_masters_user_id ON stanok_masters(user_id);
      CREATE INDEX IF NOT EXISTS idx_stanok_masters_city ON stanok_masters(city);
      CREATE INDEX IF NOT EXISTS idx_delivery_drivers_user_id ON delivery_drivers(user_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_drivers_city ON delivery_drivers(city);
      CREATE INDEX IF NOT EXISTS idx_stanok_ads_user_id ON stanok_ads(user_id);
      CREATE INDEX IF NOT EXISTS idx_stanok_ads_city ON stanok_ads(city);
      CREATE INDEX IF NOT EXISTS idx_stanok_ads_condition ON stanok_ads(condition);
      CREATE TABLE IF NOT EXISTS sms_codes (
        phone TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sms_log (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        ip TEXT DEFAULT '',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sms_log_phone_created ON sms_log(phone, created_at);
      CREATE INDEX IF NOT EXISTS idx_sms_log_ip_created ON sms_log(ip, created_at);
      CREATE INDEX IF NOT EXISTS idx_sms_log_created ON sms_log(created_at);
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
    CREATE TABLE IF NOT EXISTS workers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, specs TEXT NOT NULL, experience TEXT NOT NULL, about TEXT DEFAULT '', rating REAL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5), jobs_done INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, salary_from INTEGER, salary_to INTEGER, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, company TEXT NOT NULL, type TEXT NOT NULL, work_type TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, experience TEXT NOT NULL, salary_from INTEGER NOT NULL, salary_to INTEGER NOT NULL, specs TEXT NOT NULL, description TEXT DEFAULT '', badge TEXT, lat REAL, lng REAL, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS waste_buyers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', price_termo INTEGER DEFAULT 0, price_pvx_oq INTEGER DEFAULT 0, price_pvx_rangli INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, price_alikabond INTEGER DEFAULT 0, rating REAL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5), verified INTEGER DEFAULT 0, top INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS usluga_providers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', specs TEXT NOT NULL DEFAULT '[]', price_termo INTEGER DEFAULT 0, price_pvx INTEGER DEFAULT 0, price_alyumin INTEGER DEFAULT 0, price_surma INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS stanok_masters (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, district TEXT NOT NULL, about TEXT DEFAULT '', specs TEXT NOT NULL DEFAULT '[]', price_diagnostika INTEGER DEFAULT 0, urgent INTEGER DEFAULT 0, experience TEXT DEFAULT '', verified INTEGER DEFAULT 0, lat REAL, lng REAL, telegram TEXT, created_at INTEGER DEFAULT (strftime('%s','now')));
    CREATE TABLE IF NOT EXISTS delivery_drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      vehicle_model TEXT NOT NULL,
      is_custom_vehicle INTEGER DEFAULT 0,
      vehicle_image_url TEXT,
      about TEXT DEFAULT '',
      verified INTEGER DEFAULT 0,
      lat REAL,
      lng REAL,
      telegram TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS stanok_ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      stanok_type TEXT,
      condition TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      description TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      lat REAL,
      lng REAL,
      telegram TEXT,
      verified INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS install_brigades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      about TEXT DEFAULT '',
      specs TEXT NOT NULL DEFAULT '[]',
      team_size INTEGER DEFAULT 1,
      experience TEXT DEFAULT '',
      price_termo INTEGER DEFAULT 0,
      price_pvx INTEGER DEFAULT 0,
      price_alyumin INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      lat REAL,
      lng REAL,
      telegram TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_install_brigades_user_id ON install_brigades(user_id);
    CREATE INDEX IF NOT EXISTS idx_install_brigades_city ON install_brigades(city);
    CREATE TABLE IF NOT EXISTS arkachilar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      about TEXT DEFAULT '',
      specs TEXT NOT NULL DEFAULT '[]',
      experience TEXT DEFAULT '',
      price_termo INTEGER DEFAULT 0,
      price_pvx INTEGER DEFAULT 0,
      price_alyumin INTEGER DEFAULT 0,
      price_jp_fasad INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      lat REAL,
      lng REAL,
      telegram TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_arkachilar_user_id ON arkachilar(user_id);
    CREATE INDEX IF NOT EXISTS idx_arkachilar_city ON arkachilar(city);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
    CREATE INDEX IF NOT EXISTS idx_workers_city ON workers(city);
    CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
    CREATE INDEX IF NOT EXISTS idx_waste_buyers_user_id ON waste_buyers(user_id);
    CREATE INDEX IF NOT EXISTS idx_waste_buyers_city ON waste_buyers(city);
    CREATE INDEX IF NOT EXISTS idx_usluga_providers_user_id ON usluga_providers(user_id);
    CREATE INDEX IF NOT EXISTS idx_usluga_providers_city ON usluga_providers(city);
    CREATE INDEX IF NOT EXISTS idx_stanok_masters_user_id ON stanok_masters(user_id);
    CREATE INDEX IF NOT EXISTS idx_stanok_masters_city ON stanok_masters(city);
    CREATE INDEX IF NOT EXISTS idx_delivery_drivers_user_id ON delivery_drivers(user_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_drivers_city ON delivery_drivers(city);
    CREATE INDEX IF NOT EXISTS idx_stanok_ads_user_id ON stanok_ads(user_id);
    CREATE INDEX IF NOT EXISTS idx_stanok_ads_city ON stanok_ads(city);
    CREATE INDEX IF NOT EXISTS idx_stanok_ads_condition ON stanok_ads(condition);
    CREATE TABLE IF NOT EXISTS sms_codes (
      phone TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sms_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      ip TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sms_log_phone_created ON sms_log(phone, created_at);
    CREATE INDEX IF NOT EXISTS idx_sms_log_ip_created ON sms_log(ip, created_at);
    CREATE INDEX IF NOT EXISTS idx_sms_log_created ON sms_log(created_at);
  `);
  try { db.exec(`ALTER TABLE stanok_masters ADD COLUMN price_charxlash INTEGER DEFAULT 0`); } catch (_) {}
  try { db.exec(`ALTER TABLE install_brigades ADD COLUMN price_jp_fasad INTEGER DEFAULT 0`); } catch (_) {}
  try { db.exec(`ALTER TABLE workers ADD COLUMN work_type TEXT DEFAULT ''`); } catch (_) {}
  try { db.exec(`ALTER TABLE waste_buyers ADD COLUMN price_alikabond INTEGER DEFAULT 0`); } catch (_) {}
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
