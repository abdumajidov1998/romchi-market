const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { q, init } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'romchi-dev-secret-change-me';
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const row = (r) => {
  if (!r) return r;
  if (typeof r.specs === 'string') r.specs = JSON.parse(r.specs);
  if ('verified' in r) r.verified = !!r.verified;
  if ('top' in r) r.top = !!r.top;
  if ('jobs_done' in r) { r.jobs = r.jobs_done; delete r.jobs_done; }
  if ('salary_from' in r) { r.salaryFrom = r.salary_from; delete r.salary_from; }
  if ('salary_to' in r) { r.salaryTo = r.salary_to; delete r.salary_to; }
  if ('work_type' in r) { r.workType = r.work_type; delete r.work_type; }
  return r;
};

const auth = (req, res, next) => {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!t) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/health', (_, res) => res.json({ ok: true, time: Date.now() }));

// === SMS TASDIQLASH ===
const ESKIZ_EMAIL = process.env.ESKIZ_EMAIL || '';
const ESKIZ_PASSWORD = process.env.ESKIZ_PASSWORD || '';
const smsCodes = new Map(); // phone -> { code, expires, attempts }

async function getEskizToken() {
  if (!ESKIZ_EMAIL || !ESKIZ_PASSWORD) return null;
  try {
    const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ESKIZ_EMAIL, password: ESKIZ_PASSWORD }),
    });
    const data = await res.json();
    return data.data?.token || null;
  } catch { return null; }
}

async function sendSmsViaEskiz(phone, code) {
  const token = await getEskizToken();
  if (!token) {
    console.log(`[DEV] SMS code for ${phone}: ${code}`);
    return true; // dev mode — kod konsolga chiqadi
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile_phone: cleanPhone,
      message: `Romchi Market: ${code} - tasdiqlash kodi\n@romchi-market.onrender.com #${code}`,
      from: '4546',
    }),
  });
  return res.ok;
}

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Telefon raqam kerak' });
    const cleanPhone = phone.replace(/\s/g, '');

    // 60 soniyada 1 marta cheklash
    const existing = smsCodes.get(cleanPhone);
    if (existing && existing.expires > Date.now() && (existing.expires - Date.now()) > 4 * 60 * 1000) {
      return res.status(429).json({ error: 'Kod allaqachon yuborildi. 60 soniya kutib qayta urinib ko\'ring.' });
    }

    const code = String(Math.floor(1000 + Math.random() * 9000)); // 4 raqamli
    smsCodes.set(cleanPhone, { code, expires: Date.now() + 5 * 60 * 1000, attempts: 0 });

    await sendSmsViaEskiz(cleanPhone, code);
    res.json({ ok: true, message: 'Kod yuborildi' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { phone, code, password, role } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: 'Telefon va kod kerak' });
    const cleanPhone = phone.replace(/\s/g, '');

    const entry = smsCodes.get(cleanPhone);
    if (!entry) return res.status(400).json({ error: 'Avval kod yuboring' });
    if (entry.expires < Date.now()) { smsCodes.delete(cleanPhone); return res.status(400).json({ error: 'Kod muddati tugagan. Qayta yuboring.' }); }
    if (entry.attempts >= 5) { smsCodes.delete(cleanPhone); return res.status(400).json({ error: 'Juda ko\'p urinish. Qayta kod yuboring.' }); }

    entry.attempts++;
    if (entry.code !== code) return res.status(400).json({ error: 'Kod noto\'g\'ri' });

    smsCodes.delete(cleanPhone);

    // Foydalanuvchi mavjudmi?
    const existingUser = await q('SELECT * FROM users WHERE phone = $1', [cleanPhone]);
    if (existingUser.rows.length) {
      const user = existingUser.rows[0];
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: { id: user.id, phone: user.phone, role: user.role }, isNew: false });
    }

    // Yangi foydalanuvchi
    if (!password || !role) return res.status(400).json({ error: 'Parol va rol kerak (yangi foydalanuvchi)' });
    const hash = bcrypt.hashSync(password, 10);
    const userRes = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [cleanPhone, hash, role]);
    const userId = userRes.rows[0].id;
    const token = jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, phone: cleanPhone, role }, isNew: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, password, role, name, city, district, specs, experience, about, lat, lng, telegram, salaryFrom, salaryTo } = req.body || {};
    if (!phone || !password || !role) return res.status(400).json({ error: 'phone, password, role required' });
    if (!['worker', 'employer', 'waste_buyer'].includes(role)) return res.status(400).json({ error: 'invalid role' });
    const existing = await q('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length) return res.status(409).json({ error: 'Phone already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const userRes = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [phone, hash, role]);
    const userId = userRes.rows[0].id;

    if (role === 'worker' && name && city && district && specs && experience) {
      const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
      const sFrom = salaryFrom ? Number(salaryFrom) : null;
      const sTo = salaryTo ? Number(salaryTo) : null;
      await q(`INSERT INTO workers (user_id, name, city, district, specs, experience, about, lat, lng, telegram, salary_from, salary_to)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [userId, name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo]);
    }

    const token = jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, phone, role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    const r = await q('SELECT * FROM users WHERE phone = $1', [phone]);
    const user = r.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', auth, async (req, res) => {
  try {
    const r = await q('SELECT id, phone, role FROM users WHERE id = $1', [req.user.id]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'Not found' });
    let profile = null;
    if (user.role === 'worker') {
      const pr = await q('SELECT * FROM workers WHERE user_id = $1', [user.id]);
      profile = pr.rows[0] ? row(pr.rows[0]) : null;
    }
    res.json({ user, profile });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/workers', async (req, res) => {
  try {
    const { city, spec, query: qr } = req.query;
    let sql = 'SELECT workers.*, users.phone AS phone FROM workers LEFT JOIN users ON users.id = workers.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (qr) { sql += ` AND (name ILIKE $${n} OR about ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ' ORDER BY top DESC, rating DESC, workers.id DESC';
    const r = await q(sql, params);
    let list = r.rows.map(row);
    if (spec) list = list.filter(w => w.specs.includes(spec));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/workers/:id', async (req, res) => {
  try {
    const r = await q('SELECT workers.*, users.phone AS phone FROM workers LEFT JOIN users ON users.id = workers.user_id WHERE workers.id = $1', [req.params.id]);
    const w = r.rows[0] ? row(r.rows[0]) : null;
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/workers', auth, async (req, res) => {
  try {
    const { name, city, district, specs, experience, about, lat, lng, telegram, salaryFrom, salaryTo } = req.body || {};
    if (!name || !city || !district || !specs || !experience) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const sFrom = salaryFrom ? Number(salaryFrom) : null;
    const sTo = salaryTo ? Number(salaryTo) : null;
    const existing = await q('SELECT id FROM workers WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE workers SET name=$1, city=$2, district=$3, specs=$4, experience=$5, about=$6, lat=$7, lng=$8, telegram=$9, salary_from=$10, salary_to=$11 WHERE user_id=$12`,
        [name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo, req.user.id]);
      const r = await q('SELECT * FROM workers WHERE user_id=$1', [req.user.id]);
      return res.json(row(r.rows[0]));
    }
    const r = await q(`INSERT INTO workers (user_id, name, city, district, specs, experience, about, lat, lng, telegram, salary_from, salary_to)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [req.user.id, name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo]);
    const wr = await q('SELECT * FROM workers WHERE id=$1', [r.rows[0].id]);
    res.json(row(wr.rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/workers', auth, async (req, res) => {
  try {
    await q('DELETE FROM workers WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const { city, spec, query: qr } = req.query;
    let sql = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (qr) { sql += ` AND (title ILIKE $${n} OR company ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ' ORDER BY id DESC';
    const r = await q(sql, params);
    let list = r.rows.map(row);
    if (spec) list = list.filter(j => j.specs.includes(spec));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const r = await q('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    const j = r.rows[0] ? row(r.rows[0]) : null;
    if (!j) return res.status(404).json({ error: 'Not found' });
    res.json(j);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/jobs/:id', auth, async (req, res) => {
  try {
    const jr = await q('SELECT * FROM jobs WHERE id=$1', [req.params.id]);
    const job = jr.rows[0];
    if (!job) return res.status(404).json({ error: 'Not found' });
    if (job.user_id !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    const b = req.body || {};
    const map = { title: 'title', company: 'company', type: 'type', workType: 'work_type', city: 'city', district: 'district', experience: 'experience', salaryFrom: 'salary_from', salaryTo: 'salary_to', description: 'description', badge: 'badge' };
    const fields = [], vals = [];
    let n = 1;
    for (const k in map) if (k in b) { fields.push(`${map[k]}=$${n++}`); vals.push(b[k]); }
    if ('specs' in b) { fields.push(`specs=$${n++}`); vals.push(JSON.stringify(b.specs)); }
    if (fields.length === 0) return res.json(row(job));
    vals.push(req.params.id);
    await q(`UPDATE jobs SET ${fields.join(',')} WHERE id=$${n}`, vals);
    const r = await q('SELECT * FROM jobs WHERE id=$1', [req.params.id]);
    res.json(row(r.rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/jobs/:id', auth, async (req, res) => {
  try {
    const jr = await q('SELECT * FROM jobs WHERE id=$1', [req.params.id]);
    const job = jr.rows[0];
    if (!job) return res.status(404).json({ error: 'Not found' });
    if (job.user_id !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    await q('DELETE FROM jobs WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs', auth, async (req, res) => {
  try {
    const { title, company, type, workType, city, district, experience, salaryFrom, salaryTo, specs, description, badge, lat, lng } = req.body || {};
    if (!title || !company || !city || !district || !salaryFrom || !salaryTo || !specs) return res.status(400).json({ error: 'Missing fields' });
    const r = await q(`INSERT INTO jobs (user_id, title, company, type, work_type, city, district, experience, salary_from, salary_to, specs, description, badge, lat, lng)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [req.user.id, title, company, type || 'Factory', workType || 'Full-time', city, district,
       experience || '', salaryFrom, salaryTo, JSON.stringify(specs), description || '', badge || null, lat ?? null, lng ?? null]);
    const jr = await q('SELECT * FROM jobs WHERE id=$1', [r.rows[0].id]);
    res.json(row(jr.rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === WASTE BUYERS ===
const wbRow = (r) => {
  if (!r) return r;
  if ('verified' in r) r.verified = !!r.verified;
  if ('top' in r) r.top = !!r.top;
  if ('price_termo' in r) { r.priceTermo = r.price_termo; delete r.price_termo; }
  if ('price_pvx_oq' in r) { r.pricePvxOq = r.price_pvx_oq; delete r.price_pvx_oq; }
  if ('price_pvx_rangli' in r) { r.pricePvxRangli = r.price_pvx_rangli; delete r.price_pvx_rangli; }
  if ('price_alyumin' in r) { r.priceAlyumin = r.price_alyumin; delete r.price_alyumin; }
  return r;
};

app.get('/api/waste-buyers', async (req, res) => {
  try {
    const { city, q: qr } = req.query;
    let sql = 'SELECT waste_buyers.*, users.phone AS phone FROM waste_buyers LEFT JOIN users ON users.id = waste_buyers.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ' ORDER BY top DESC, rating DESC, waste_buyers.id DESC';
    const r = await q(sql, params);
    res.json(r.rows.map(wbRow));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/waste-buyers/:id', async (req, res) => {
  try {
    const r = await q('SELECT waste_buyers.*, users.phone AS phone FROM waste_buyers LEFT JOIN users ON users.id = waste_buyers.user_id WHERE waste_buyers.id = $1', [req.params.id]);
    const wb = r.rows[0] ? wbRow(r.rows[0]) : null;
    if (!wb) return res.status(404).json({ error: 'Not found' });
    res.json(wb);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/waste-buyers', auth, async (req, res) => {
  try {
    const { name, city, district, about, priceTermo, pricePvxOq, pricePvxRangli, priceAlyumin, lat, lng, telegram } = req.body || {};
    if (!name || !city || !district) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const existing = await q('SELECT id FROM waste_buyers WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE waste_buyers SET name=$1,city=$2,district=$3,about=$4,price_termo=$5,price_pvx_oq=$6,price_pvx_rangli=$7,price_alyumin=$8,lat=$9,lng=$10,telegram=$11 WHERE user_id=$12`,
        [name, city, district, about || '', priceTermo || 0, pricePvxOq || 0, pricePvxRangli || 0, priceAlyumin || 0, lat ?? null, lng ?? null, tg, req.user.id]);
      const r = await q('SELECT * FROM waste_buyers WHERE user_id=$1', [req.user.id]);
      return res.json(wbRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO waste_buyers (user_id,name,city,district,about,price_termo,price_pvx_oq,price_pvx_rangli,price_alyumin,lat,lng,telegram)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [req.user.id, name, city, district, about || '', priceTermo || 0, pricePvxOq || 0, pricePvxRangli || 0, priceAlyumin || 0, lat ?? null, lng ?? null, tg]);
    const wr = await q('SELECT * FROM waste_buyers WHERE id=$1', [r.rows[0].id]);
    res.json(wbRow(wr.rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/waste-buyers', auth, async (req, res) => {
  try {
    await q('DELETE FROM waste_buyers WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === USLUGACHILAR ===
const upRow = (r) => {
  if (!r) return r;
  if (typeof r.specs === 'string') r.specs = JSON.parse(r.specs);
  if ('verified' in r) r.verified = !!r.verified;
  if ('price_termo' in r) { r.priceTermo = r.price_termo; delete r.price_termo; }
  if ('price_pvx' in r) { r.pricePvx = r.price_pvx; delete r.price_pvx; }
  if ('price_alyumin' in r) { r.priceAlyumin = r.price_alyumin; delete r.price_alyumin; }
  if ('price_surma' in r) { r.priceSurma = r.price_surma; delete r.price_surma; }
  return r;
};

app.get('/api/usluga', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    let sql = 'SELECT usluga_providers.*, users.phone AS phone FROM usluga_providers LEFT JOIN users ON users.id = usluga_providers.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ' ORDER BY verified DESC, usluga_providers.id DESC';
    const r = await q(sql, params);
    let list = r.rows.map(upRow);
    if (spec) list = list.filter(u => u.specs.includes(spec));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/usluga/:id', async (req, res) => {
  try {
    const r = await q('SELECT usluga_providers.*, users.phone AS phone FROM usluga_providers LEFT JOIN users ON users.id = usluga_providers.user_id WHERE usluga_providers.id = $1', [req.params.id]);
    const u = r.rows[0] ? upRow(r.rows[0]) : null;
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/usluga', auth, async (req, res) => {
  try {
    const { name, city, district, about, specs, priceTermo, pricePvx, priceAlyumin, priceSurma, lat, lng, telegram } = req.body || {};
    if (!name || !city || !district || !specs || specs.length === 0) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const existing = await q('SELECT id FROM usluga_providers WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE usluga_providers SET name=$1,city=$2,district=$3,about=$4,specs=$5,price_termo=$6,price_pvx=$7,price_alyumin=$8,price_surma=$9,lat=$10,lng=$11,telegram=$12 WHERE user_id=$13`,
        [name, city, district, about || '', JSON.stringify(specs), priceTermo || 0, pricePvx || 0, priceAlyumin || 0, priceSurma || 0, lat ?? null, lng ?? null, tg, req.user.id]);
      const r = await q('SELECT * FROM usluga_providers WHERE user_id=$1', [req.user.id]);
      return res.json(upRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO usluga_providers (user_id,name,city,district,about,specs,price_termo,price_pvx,price_alyumin,price_surma,lat,lng,telegram)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [req.user.id, name, city, district, about || '', JSON.stringify(specs), priceTermo || 0, pricePvx || 0, priceAlyumin || 0, priceSurma || 0, lat ?? null, lng ?? null, tg]);
    const ur = await q('SELECT * FROM usluga_providers WHERE id=$1', [r.rows[0].id]);
    res.json(upRow(ur.rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === STANOK REMONT ===
const smRow = (r) => {
  if (!r) return r;
  if (typeof r.specs === 'string') r.specs = JSON.parse(r.specs);
  if ('verified' in r) r.verified = !!r.verified;
  if ('urgent' in r) r.urgent = !!r.urgent;
  if ('price_diagnostika' in r) { r.priceDiagnostika = r.price_diagnostika; delete r.price_diagnostika; }
  return r;
};

app.get('/api/stanok', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    let sql = 'SELECT stanok_masters.*, users.phone AS phone FROM stanok_masters LEFT JOIN users ON users.id = stanok_masters.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ' ORDER BY verified DESC, stanok_masters.id DESC';
    const r = await q(sql, params);
    let list = r.rows.map(smRow);
    if (spec) list = list.filter(m => m.specs.includes(spec));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stanok/:id', async (req, res) => {
  try {
    const r = await q('SELECT stanok_masters.*, users.phone AS phone FROM stanok_masters LEFT JOIN users ON users.id = stanok_masters.user_id WHERE stanok_masters.id = $1', [req.params.id]);
    const m = r.rows[0] ? smRow(r.rows[0]) : null;
    if (!m) return res.status(404).json({ error: 'Not found' });
    res.json(m);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/stanok', auth, async (req, res) => {
  try {
    const { name, city, district, about, specs, priceDiagnostika, urgent, experience, lat, lng, telegram } = req.body || {};
    if (!name || !city || !district || !specs || specs.length === 0) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const existing = await q('SELECT id FROM stanok_masters WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE stanok_masters SET name=$1,city=$2,district=$3,about=$4,specs=$5,price_diagnostika=$6,urgent=$7,experience=$8,lat=$9,lng=$10,telegram=$11 WHERE user_id=$12`,
        [name, city, district, about || '', JSON.stringify(specs), priceDiagnostika || 0, urgent ? 1 : 0, experience || '', lat ?? null, lng ?? null, tg, req.user.id]);
      const r = await q('SELECT * FROM stanok_masters WHERE user_id=$1', [req.user.id]);
      return res.json(smRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO stanok_masters (user_id,name,city,district,about,specs,price_diagnostika,urgent,experience,lat,lng,telegram)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [req.user.id, name, city, district, about || '', JSON.stringify(specs), priceDiagnostika || 0, urgent ? 1 : 0, experience || '', lat ?? null, lng ?? null, tg]);
    const mr = await q('SELECT * FROM stanok_masters WHERE id=$1', [r.rows[0].id]);
    res.json(smRow(mr.rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/stanok', auth, async (req, res) => {
  try {
    await q('DELETE FROM stanok_masters WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/usluga', auth, async (req, res) => {
  try {
    await q('DELETE FROM usluga_providers WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// /api/me ga profillar qo'shish
app.get('/api/me/profiles', auth, async (req, res) => {
  try {
    const worker = await q('SELECT * FROM workers WHERE user_id = $1', [req.user.id]);
    const wb = await q('SELECT * FROM waste_buyers WHERE user_id = $1', [req.user.id]);
    const up = await q('SELECT * FROM usluga_providers WHERE user_id = $1', [req.user.id]);
    const sm = await q('SELECT * FROM stanok_masters WHERE user_id = $1', [req.user.id]);
    res.json({
      worker: worker.rows[0] ? row(worker.rows[0]) : null,
      wasteBuyer: wb.rows[0] ? wbRow(wb.rows[0]) : null,
      usluga: up.rows[0] ? upRow(up.rows[0]) : null,
      stanok: sm.rows[0] ? smRow(sm.rows[0]) : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function seed() {
  const r = await q('SELECT COUNT(*) as c FROM workers');
  if (parseInt(r.rows[0].c) === 0) {
    const h = bcrypt.hashSync('demo1234', 10);
    const sampleWorkers = [
      { name: 'Sardor Rahimov', city: 'Toshkent', district: 'Yunusobod', specs: ['PVX', 'Termo'], experience: '5+ yil', about: '5 yillik PVX deraza yasash tajribasi. O\'z asboblari bor.', rating: 4.9, jobs_done: 87, verified: 1, top: 1 },
      { name: 'Jamshid Mirzoyev', city: 'Toshkent', district: 'Chilonzor', specs: ['Alyumin'], experience: '3–5 yil', about: 'Alyumin fasad bo\'yicha mutaxassis.', rating: 4.6, jobs_done: 34, verified: 0, top: 0 },
      { name: 'Bekzod Umarov', city: 'Toshkent', district: 'Mirzo Ulug\'bek', specs: ['PVX', 'Alyumin'], experience: '5+ yil', about: '7 yillik tajriba, aniq va tez.', rating: 5.0, jobs_done: 142, verified: 1, top: 1 },
      { name: 'Otabek Yusupov', city: 'Toshkent', district: 'Yashnobod', specs: ['Alyumin', 'Termo'], experience: '5+ yil', about: 'Alyumin eshiklar va vitrajli fasadlar.', rating: 4.8, jobs_done: 92, verified: 1, top: 1 },
    ];
    for (let i = 0; i < sampleWorkers.length; i++) {
      const w = sampleWorkers[i];
      const ur = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [`+99890000000${i + 1}`, h, 'worker']);
      await q(`INSERT INTO workers (user_id,name,city,district,specs,experience,about,rating,jobs_done,verified,top)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [ur.rows[0].id, w.name, w.city, w.district, JSON.stringify(w.specs), w.experience, w.about, w.rating, w.jobs_done, w.verified, w.top]);
    }
    const empRes = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', ['+998900000099', h, 'employer']);
    const empId = empRes.rows[0].id;
    const sampleJobs = [
      { title: 'PVX deraza yasovchi usta', company: 'Oyna Plast MChJ', type: 'Factory', work_type: 'Full-time', city: 'Toshkent', district: 'Chilonzor', experience: '3+ yil', salary_from: 5000000, salary_to: 8000000, specs: ['PVX'], description: '3+ yil tajriba, o\'z asboblari kerak.', badge: 'New' },
      { title: 'Alyumin fasad yasovchi usta', company: 'AluTech', type: 'Workshop', work_type: 'Project', city: 'Toshkent', district: 'Yunusobod', experience: '5+ yil', salary_from: 9000000, salary_to: 12000000, specs: ['Alyumin'], description: 'Shoshilinch loyiha, 6 hafta.', badge: 'Top' },
      { title: 'Termo deraza yasovchi usta', company: 'Doors24', type: 'Factory', work_type: 'Part-time', city: 'Toshkent', district: 'Mirzo Ulug\'bek', experience: '2+ yil', salary_from: 3000000, salary_to: 5000000, specs: ['Termo'], description: 'Termo profil bo\'yicha usta.', badge: 'Verified' },
    ];
    for (const j of sampleJobs) {
      await q(`INSERT INTO jobs (user_id,title,company,type,work_type,city,district,experience,salary_from,salary_to,specs,description,badge)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [empId, j.title, j.company, j.type, j.work_type, j.city, j.district, j.experience, j.salary_from, j.salary_to, JSON.stringify(j.specs), j.description, j.badge]);
    }
    console.log('Seeded sample data.');
  }

  // Seed waste buyers
  const wbr = await q('SELECT COUNT(*) as c FROM waste_buyers');
  if (parseInt(wbr.rows[0].c) === 0) {
    const h = bcrypt.hashSync('demo1234', 10);
    const sampleWB = [
      { name: 'Alisher Atxodchi', city: 'Toshkent', district: 'Sergeli', about: 'Barcha turdagi atxodlarni olamiz. Tez va qulay.', price_termo: 4000, price_pvx_oq: 10000, price_pvx_rangli: 5000, price_alyumin: 10000, rating: 4.7, verified: 1, top: 1 },
      { name: 'Dilshod Metall', city: 'Toshkent', district: 'Chilonzor', about: 'Alyumin va PVX atxodlarini yuqori narxda sotib olamiz.', price_termo: 3500, price_pvx_oq: 9000, price_pvx_rangli: 4500, price_alyumin: 11000, rating: 4.5, verified: 1, top: 0 },
      { name: 'Farrux Plast', city: 'Toshkent', district: 'Yunusobod', about: 'PVX atxodlari bo\'yicha eng yaxshi narx.', price_termo: 3000, price_pvx_oq: 12000, price_pvx_rangli: 6000, price_alyumin: 9000, rating: 4.9, verified: 0, top: 1 },
    ];
    for (let i = 0; i < sampleWB.length; i++) {
      const wb = sampleWB[i];
      const ur = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [`+99891000000${i + 1}`, h, 'waste_buyer']);
      await q(`INSERT INTO waste_buyers (user_id,name,city,district,about,price_termo,price_pvx_oq,price_pvx_rangli,price_alyumin,rating,verified,top)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [ur.rows[0].id, wb.name, wb.city, wb.district, wb.about, wb.price_termo, wb.price_pvx_oq, wb.price_pvx_rangli, wb.price_alyumin, wb.rating, wb.verified, wb.top]);
    }
    console.log('Seeded waste buyers.');
  }

  // Seed uslugachilar
  const upr = await q('SELECT COUNT(*) as c FROM usluga_providers');
  if (parseInt(upr.rows[0].c) === 0) {
    const h = bcrypt.hashSync('demo1234', 10);
    const sampleUP = [
      { name: 'Grand Oyna Sex', city: 'Toshkent', district: 'Sergeli', specs: ['PVX', 'Termo', 'Surma'], about: 'PVX, Termo va Surma eshiklar ishlab chiqarish. Boshqa sexlar uchun buyurtma qabul qilamiz.', price_termo: 85000, price_pvx: 120000, price_alyumin: 0, price_surma: 150000, verified: 1 },
      { name: 'AluPro Zavod', city: 'Toshkent', district: 'Chilonzor', specs: ['Alyumin', 'Surma'], about: 'Alyumin fasad, vitrazhlar va surma eshiklar. Metr kvadratga ishlaymiz.', price_termo: 0, price_pvx: 0, price_alyumin: 180000, price_surma: 200000, verified: 1 },
      { name: 'TermoPlast Sex', city: 'Toshkent', district: 'Yunusobod', specs: ['Termo', 'PVX', 'Alyumin', 'Surma'], about: 'Barcha turdagi deraza va eshiklar. Optom narxlarda.', price_termo: 75000, price_pvx: 110000, price_alyumin: 160000, price_surma: 140000, verified: 0 },
    ];
    for (let i = 0; i < sampleUP.length; i++) {
      const u = sampleUP[i];
      const ur = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [`+99892000000${i + 1}`, h, 'usluga']);
      await q(`INSERT INTO usluga_providers (user_id,name,city,district,about,specs,price_termo,price_pvx,price_alyumin,price_surma,verified)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [ur.rows[0].id, u.name, u.city, u.district, u.about, JSON.stringify(u.specs), u.price_termo, u.price_pvx, u.price_alyumin, u.price_surma, u.verified]);
    }
    console.log('Seeded usluga providers.');
  }

  // Seed stanok masters
  const smr = await q('SELECT COUNT(*) as c FROM stanok_masters');
  if (parseInt(smr.rows[0].c) === 0) {
    const h = bcrypt.hashSync('demo1234', 10);
    const sampleSM = [
      { name: 'Anvar Stanok Servis', city: 'Toshkent', district: 'Chilonzor', specs: ['Kesish stanogi', 'Frezerlash stanogi'], about: 'Barcha turdagi kesish va frezerlash stanoklarini ta\'mirlaymiz. 10 yillik tajriba.', price_diagnostika: 200000, urgent: 1, experience: '5+ yil', verified: 1 },
      { name: 'Rustam Arra Chaxlovchi', city: 'Toshkent', district: 'Sergeli', specs: ['Arra chaxlovchi'], about: 'Diskali, lentali arralarni chaxlaymiz. Sifatli va tez.', price_diagnostika: 50000, urgent: 0, experience: '3-5 yil', verified: 1 },
      { name: 'Bobur Kompressor Servis', city: 'Toshkent', district: 'Yunusobod', specs: ['Kompressor', 'Pressovka stanogi'], about: 'Kompressor va press stanoklari bo\'yicha mutaxassis.', price_diagnostika: 150000, urgent: 1, experience: '5+ yil', verified: 0 },
      { name: 'Sherzod Universal Usta', city: 'Toshkent', district: 'Yashnobod', specs: ['Kesish stanogi', 'Payvandlash stanogi', 'Kompressor', 'Arra chaxlovchi'], about: 'Barcha turdagi stanoklar. 24/7 chiqaman.', price_diagnostika: 100000, urgent: 1, experience: '5+ yil', verified: 1 },
    ];
    for (let i = 0; i < sampleSM.length; i++) {
      const m = sampleSM[i];
      const ur = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [`+99893000000${i + 1}`, h, 'stanok']);
      await q(`INSERT INTO stanok_masters (user_id,name,city,district,about,specs,price_diagnostika,urgent,experience,verified)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [ur.rows[0].id, m.name, m.city, m.district, m.about, JSON.stringify(m.specs), m.price_diagnostika, m.urgent ? 1 : 0, m.experience, m.verified]);
    }
    console.log('Seeded stanok masters.');
  }
}

const buildDir = process.env.DATABASE_URL ? path.join(__dirname, '..', 'build') : path.join(__dirname, '..', '..', 'build');
app.use(express.static(buildDir));
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(buildDir, 'index.html')));

init().then(() => seed()).then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Romchi backend on :${PORT}`));
}).catch(e => { console.error('DB init failed:', e); process.exit(1); });
