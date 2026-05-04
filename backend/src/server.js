const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { q, init } = require('./db');
const pino = require('pino');
const pinoHttp = require('pino-http');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
  }),
});

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('JWT_SECRET env required in production') })()
  : 'romchi-dev-secret-change-me');
if (!process.env.JWT_SECRET) logger.warn('JWT_SECRET not set — using dev fallback');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(pinoHttp({ logger }));
const allowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowed && allowed.length ? allowed : (process.env.NODE_ENV === 'production' ? false : true),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext || '.jpg'}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Faqat rasm fayllari qabul qilinadi'));
    cb(null, true);
  },
});
const uploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    const msg = err instanceof multer.MulterError
      ? (err.code === 'LIMIT_FILE_SIZE' ? 'Rasm hajmi 5MB dan oshmasin' : `Yuklash xatosi: ${err.code}`)
      : (err.message || 'Yuklash xatosi');
    res.status(400).json({ error: msg });
  });
};
app.use('/uploads', express.static(UPLOAD_DIR));

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

const ADMIN_PHONES = (process.env.ADMIN_PHONES || '').split(',').map(s => s.trim()).filter(Boolean);
const isAdminPhone = (phone) => ADMIN_PHONES.includes(String(phone || '').trim());

const requireAdmin = async (req, res, next) => {
  try {
    const r = await q('SELECT phone FROM users WHERE id = $1', [req.user.id]);
    const phone = r.rows[0]?.phone;
    if (!phone || !isAdminPhone(phone)) return res.status(403).json({ error: 'Forbidden' });
    req.adminPhone = phone;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

app.get('/api/health', (_, res) => res.json({ ok: true, time: Date.now() }));

// === SMS TASDIQLASH ===
const ESKIZ_EMAIL = process.env.ESKIZ_EMAIL || '';
const ESKIZ_PASSWORD = process.env.ESKIZ_PASSWORD || '';

// Limits — sozlanadigan
const SMS_COOLDOWN_SEC = parseInt(process.env.SMS_COOLDOWN_SEC) || 60;
const SMS_LIMIT_PHONE_HOUR = parseInt(process.env.SMS_LIMIT_PHONE_HOUR) || 10;
const SMS_LIMIT_IP_HOUR = parseInt(process.env.SMS_LIMIT_IP_HOUR) || 30;
const SMS_LIMIT_IP_DAY = parseInt(process.env.SMS_LIMIT_IP_DAY) || 100;

const nowSec = () => Math.floor(Date.now() / 1000);

async function getSmsCode(phone) {
  const r = await q('SELECT * FROM sms_codes WHERE phone = $1', [phone]);
  return r.rows[0];
}

async function setSmsCode(phone, code, expiresAt) {
  await q('DELETE FROM sms_codes WHERE phone = $1', [phone]);
  await q('INSERT INTO sms_codes (phone, code, expires_at, attempts, created_at) VALUES ($1,$2,$3,0,$4)', [phone, code, expiresAt, nowSec()]);
}

async function deleteSmsCode(phone) {
  await q('DELETE FROM sms_codes WHERE phone = $1', [phone]);
}

async function bumpAttempts(phone) {
  await q('UPDATE sms_codes SET attempts = attempts + 1 WHERE phone = $1', [phone]);
}

async function logSms(phone, ip) {
  await q('INSERT INTO sms_log (phone, ip, created_at) VALUES ($1,$2,$3)', [phone, ip || '', nowSec()]);
}

async function smsCount(field, value, sinceSec) {
  const sql = `SELECT COUNT(*) AS c FROM sms_log WHERE ${field} = $1 AND created_at > $2`;
  const r = await q(sql, [value, sinceSec]);
  return Number(r.rows[0]?.c || 0);
}

// Eskirgan kodlarni va eski log yozuvlarini har 5 daqiqada tozalash
setInterval(async () => {
  try {
    await q('DELETE FROM sms_codes WHERE expires_at < $1', [nowSec()]);
    const weekAgo = nowSec() - 7 * 24 * 3600;
    await q('DELETE FROM sms_log WHERE created_at < $1', [weekAgo]);
  } catch (e) { logger.warn({ err: e }, 'sms cleanup failed'); }
}, 5 * 60 * 1000);

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
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMS provider not configured');
    }
    logger.info({ phone, code }, '[DEV] SMS code');
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
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

    // 1) Cooldown: SMS_COOLDOWN_SEC ichida bitta SMS
    const existing = await getSmsCode(cleanPhone);
    if (existing) {
      const elapsed = nowSec() - existing.created_at;
      if (elapsed < SMS_COOLDOWN_SEC) {
        return res.status(429).json({ error: `Kod yaqinda yuborildi. ${SMS_COOLDOWN_SEC - elapsed} soniya kuting.` });
      }
    }

    // 2) Telefon raqamiga soatlik limit
    const phoneCountHour = await smsCount('phone', cleanPhone, nowSec() - 3600);
    if (phoneCountHour >= SMS_LIMIT_PHONE_HOUR) {
      return res.status(429).json({ error: `Bu raqamga soatiga ${SMS_LIMIT_PHONE_HOUR} ta SMS yuborildi. Keyinroq urining.` });
    }

    // 3) IP'ga soatlik va kunlik limit
    if (ip) {
      const ipHour = await smsCount('ip', ip, nowSec() - 3600);
      if (ipHour >= SMS_LIMIT_IP_HOUR) return res.status(429).json({ error: 'Juda ko\'p so\'rov. Keyinroq urining.' });
      const ipDay = await smsCount('ip', ip, nowSec() - 24 * 3600);
      if (ipDay >= SMS_LIMIT_IP_DAY) return res.status(429).json({ error: 'Kunlik limit oshib ketdi.' });
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    await setSmsCode(cleanPhone, code, nowSec() + 5 * 60); // 5 daqiqa amal qiladi
    await logSms(cleanPhone, ip);

    await sendSmsViaEskiz(cleanPhone, code);
    logger.info({ phone: cleanPhone, ip, phoneCountHour: phoneCountHour + 1 }, 'sms sent');

    const devMode = !ESKIZ_EMAIL || !ESKIZ_PASSWORD;
    res.json({ ok: true, message: 'Kod yuborildi', ...(devMode ? { devCode: code } : {}) });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { phone, code, password, role } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: 'Telefon va kod kerak' });
    const cleanPhone = phone.replace(/\s/g, '');

    const entry = await getSmsCode(cleanPhone);
    if (!entry) return res.status(400).json({ error: 'Avval kod yuboring' });
    if (entry.expires_at < nowSec()) { await deleteSmsCode(cleanPhone); return res.status(400).json({ error: 'Kod muddati tugagan. Qayta yuboring.' }); }
    if (entry.attempts >= 5) { await deleteSmsCode(cleanPhone); return res.status(400).json({ error: 'Juda ko\'p urinish. Qayta kod yuboring.' }); }

    await bumpAttempts(cleanPhone);
    if (entry.code !== code) return res.status(400).json({ error: 'Kod noto\'g\'ri' });

    // Foydalanuvchi mavjudmi?
    const existingUser = await q('SELECT * FROM users WHERE phone = $1', [cleanPhone]);
    if (existingUser.rows.length) {
      await deleteSmsCode(cleanPhone);
      const user = existingUser.rows[0];
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: { id: user.id, phone: user.phone, role: user.role }, isNew: false });
    }

    // Yangi foydalanuvchi — parolsiz bo'lsa, kodni saqlab qoldiramiz
    if (!password || !role) return res.status(400).json({ error: 'Parol va rol kerak (yangi foydalanuvchi)' });
    await deleteSmsCode(cleanPhone);
    const hash = bcrypt.hashSync(password, 10);
    const userRes = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [cleanPhone, hash, role]);
    const userId = userRes.rows[0].id;
    const token = jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, phone: cleanPhone, role }, isNew: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// Pre-computed dummy bcrypt hash so the user-not-found path still pays the
// bcrypt cost — prevents timing-based phone enumeration.
const DUMMY_HASH = '$2a$10$35iZ/TnaGQUKEv5Q4yBZMe.J6PbpxD7Sa4NAt9bDyUYuWpWPiDqWm';

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    const r = await q('SELECT * FROM users WHERE phone = $1', [phone]);
    const user = r.rows[0];
    const hash = user ? user.password_hash : DUMMY_HASH;
    const ok = bcrypt.compareSync(password || '', hash);
    if (!user || !ok) return res.status(401).json({ error: 'Telefon yoki parol noto\'g\'ri' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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
    res.json({ user, profile, isAdmin: isAdminPhone(user.phone) });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// === ADMIN ===
// descCol — qisqa tavsif aniqlash uchun. imageCol — rasmsiz e'lon. priceCol — narxsiz savdo e'loni.
const ADMIN_TYPES = {
  workers:           { table: 'workers',           userIdCol: 'user_id', descCol: 'about',       hasVerified: true,  imageCol: null,                priceCol: null },
  jobs:              { table: 'jobs',              userIdCol: 'user_id', descCol: 'description', hasVerified: false, imageCol: null,                priceCol: null },
  'waste-buyers':    { table: 'waste_buyers',      userIdCol: 'user_id', descCol: 'about',       hasVerified: true,  imageCol: null,                priceCol: null },
  usluga:            { table: 'usluga_providers',  userIdCol: 'user_id', descCol: 'about',       hasVerified: true,  imageCol: null,                priceCol: null },
  stanok:            { table: 'stanok_masters',    userIdCol: 'user_id', descCol: 'about',       hasVerified: true,  imageCol: null,                priceCol: null },
  'stanok-ads':      { table: 'stanok_ads',        userIdCol: 'user_id', descCol: 'description', hasVerified: true,  imageCol: 'image_url',         priceCol: 'price' },
  // delivery: imageCol null — preset avtomobil rasmlari ishlatiladi (DELIVERY_VEHICLES), shuning uchun "rasmsiz" hisoblanmaydi.
  delivery:          { table: 'delivery_drivers',  userIdCol: 'user_id', descCol: 'about',       hasVerified: true,  imageCol: null,                priceCol: null },
  'install-brigades':{ table: 'install_brigades',  userIdCol: 'user_id', descCol: 'about',       hasVerified: true,  imageCol: null,                priceCol: null },
  arkachilar:        { table: 'arkachilar',        userIdCol: 'user_id', descCol: 'about',       hasVerified: true,  imageCol: null,                priceCol: null },
};

// Qisqa tavsif chegarasi (belgi soni). Bo'sh va undan qisqa tavsiflar "qisqa" sanaladi.
const SHORT_DESC_LEN = 20;

app.get('/api/admin/stats', auth, requireAdmin, async (req, res) => {
  try {
    const now = nowSec();
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

    const counts = {};
    const today = {};
    counts.users = Number((await q('SELECT COUNT(*) AS c FROM users')).rows[0].c) || 0;
    today.users = Number((await q('SELECT COUNT(*) AS c FROM users WHERE created_at > $1', [todayStart])).rows[0].c) || 0;

    const unverified = {};
    const noImage = {};
    const noPrice = {};
    const shortDesc = {};
    let unverifiedTotal = 0, noImageTotal = 0, noPriceTotal = 0, shortDescTotal = 0;

    for (const [key, def] of Object.entries(ADMIN_TYPES)) {
      counts[key] = Number((await q(`SELECT COUNT(*) AS c FROM ${def.table}`)).rows[0].c) || 0;
      today[key]  = Number((await q(`SELECT COUNT(*) AS c FROM ${def.table} WHERE created_at > $1`, [todayStart])).rows[0].c) || 0;

      if (def.hasVerified) {
        const c = Number((await q(`SELECT COUNT(*) AS c FROM ${def.table} WHERE verified = 0`)).rows[0].c) || 0;
        unverified[key] = c; unverifiedTotal += c;
      }
      if (def.imageCol) {
        const c = Number((await q(`SELECT COUNT(*) AS c FROM ${def.table} WHERE ${def.imageCol} IS NULL OR ${def.imageCol} = ''`)).rows[0].c) || 0;
        noImage[key] = c; noImageTotal += c;
      }
      if (def.priceCol) {
        const c = Number((await q(`SELECT COUNT(*) AS c FROM ${def.table} WHERE ${def.priceCol} IS NULL OR ${def.priceCol} = 0`)).rows[0].c) || 0;
        noPrice[key] = c; noPriceTotal += c;
      }
      const sc = Number((await q(`SELECT COUNT(*) AS c FROM ${def.table} WHERE COALESCE(LENGTH(${def.descCol}), 0) < $1`, [SHORT_DESC_LEN])).rows[0].c) || 0;
      shortDesc[key] = sc; shortDescTotal += sc;
    }

    // Hududlar — barcha jadval city ustunlarini birlashtirib, hammasini qaytaradi.
    const cityUnion = Object.values(ADMIN_TYPES).map(d => `SELECT city FROM ${d.table}`).join(' UNION ALL ');
    const citiesSql = `SELECT city, COUNT(*) AS c FROM (${cityUnion}) t WHERE city IS NOT NULL AND city <> '' GROUP BY city ORDER BY c DESC`;
    const cities = (await q(citiesSql)).rows.map(r => ({ city: r.city, count: Number(r.c) || 0 }));

    const smsToday = Number((await q('SELECT COUNT(*) AS c FROM sms_log WHERE created_at > $1', [now - 24 * 3600])).rows[0].c) || 0;
    const smsHour  = Number((await q('SELECT COUNT(*) AS c FROM sms_log WHERE created_at > $1', [now - 3600])).rows[0].c) || 0;

    res.json({
      counts,
      today,
      unverified,
      quality: { noImage, noPrice, shortDesc },
      cities,
      attention: { moderation: unverifiedTotal, noImage: noImageTotal, noPrice: noPriceTotal, shortDesc: shortDescTotal },
      sms: { lastHour: smsHour, last24h: smsToday },
    });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', auth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const search = (req.query.q || '').trim();
    let sql = 'SELECT id, phone, role, created_at FROM users';
    const params = [];
    if (search) { sql += ' WHERE phone ILIKE $1'; params.push(`%${search}%`); }
    sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    const r = await q(sql, params);
    const list = r.rows.map(u => ({ ...u, isAdmin: isAdminPhone(u.phone) }));
    res.json(list);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const u = (await q('SELECT phone FROM users WHERE id = $1', [id])).rows[0];
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (isAdminPhone(u.phone)) return res.status(400).json({ error: 'Cannot delete admin' });
    await q('DELETE FROM users WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/listings/:type', auth, requireAdmin, async (req, res) => {
  try {
    const def = ADMIN_TYPES[req.params.type];
    if (!def) return res.status(400).json({ error: 'Unknown type' });
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const sql = `SELECT t.*, u.phone AS phone FROM ${def.table} t LEFT JOIN users u ON u.id = t.${def.userIdCol} ORDER BY t.id DESC LIMIT $1 OFFSET $2`;
    const r = await q(sql, [limit, offset]);
    res.json(r.rows.map(row));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/listings/:type/:id', auth, requireAdmin, async (req, res) => {
  try {
    const def = ADMIN_TYPES[req.params.type];
    if (!def) return res.status(400).json({ error: 'Unknown type' });
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await q(`DELETE FROM ${def.table} WHERE id = $1`, [id]);
    res.json({ ok: true, deleted: r.rowCount });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/listings/:type/:id/verify', auth, requireAdmin, async (req, res) => {
  try {
    const def = ADMIN_TYPES[req.params.type];
    if (!def) return res.status(400).json({ error: 'Unknown type' });
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const verified = req.body?.verified ? 1 : 0;
    const r = await q(`UPDATE ${def.table} SET verified = $1 WHERE id = $2`, [verified, id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, verified: !!verified });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/workers', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT workers.*, users.phone AS phone FROM workers LEFT JOIN users ON users.id = workers.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (spec) { sql += ` AND specs ILIKE $${n++}`; params.push(`%"${spec}"%`); }
    if (qr) { sql += ` AND (name ILIKE $${n} OR about ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY top DESC, rating DESC, workers.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(row));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/workers/:id', async (req, res) => {
  try {
    const r = await q('SELECT workers.*, users.phone AS phone FROM workers LEFT JOIN users ON users.id = workers.user_id WHERE workers.id = $1', [req.params.id]);
    const w = r.rows[0] ? row(r.rows[0]) : null;
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/workers', auth, async (req, res) => {
  try {
    const { name, city, district, specs, experience, about, lat, lng, telegram, salaryFrom, salaryTo, workType } = req.body || {};
    if (!name || !city || !district || !specs || !experience) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const sFrom = salaryFrom ? Number(salaryFrom) : null;
    const sTo = salaryTo ? Number(salaryTo) : null;
    const wt = workType || '';
    const existing = await q('SELECT id FROM workers WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE workers SET name=$1, city=$2, district=$3, specs=$4, experience=$5, about=$6, lat=$7, lng=$8, telegram=$9, salary_from=$10, salary_to=$11, work_type=$12 WHERE user_id=$13`,
        [name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo, wt, req.user.id]);
      const r = await q('SELECT * FROM workers WHERE user_id=$1', [req.user.id]);
      return res.json(row(r.rows[0]));
    }
    const r = await q(`INSERT INTO workers (user_id, name, city, district, specs, experience, about, lat, lng, telegram, salary_from, salary_to, work_type)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [req.user.id, name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo, wt]);
    const wr = await q('SELECT * FROM workers WHERE id=$1', [r.rows[0].id]);
    res.json(row(wr.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/workers', auth, async (req, res) => {
  try {
    await q('DELETE FROM workers WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT jobs.*, users.phone AS phone FROM jobs LEFT JOIN users ON users.id = jobs.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (spec) { sql += ` AND specs ILIKE $${n++}`; params.push(`%"${spec}"%`); }
    if (qr) { sql += ` AND (title ILIKE $${n} OR company ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY jobs.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(row));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const r = await q('SELECT jobs.*, users.phone AS phone FROM jobs LEFT JOIN users ON users.id = jobs.user_id WHERE jobs.id = $1', [req.params.id]);
    const j = r.rows[0] ? row(r.rows[0]) : null;
    if (!j) return res.status(404).json({ error: 'Not found' });
    res.json(j);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/jobs/:id', auth, async (req, res) => {
  try {
    const jr = await q('SELECT * FROM jobs WHERE id=$1', [req.params.id]);
    const job = jr.rows[0];
    if (!job) return res.status(404).json({ error: 'Not found' });
    if (job.user_id !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    await q('DELETE FROM jobs WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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
  if ('price_alikabond' in r) { r.priceAlikabond = r.price_alikabond; delete r.price_alikabond; }
  return r;
};

app.get('/api/waste-buyers', async (req, res) => {
  try {
    const { city, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT waste_buyers.*, users.phone AS phone FROM waste_buyers LEFT JOIN users ON users.id = waste_buyers.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY top DESC, rating DESC, waste_buyers.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(wbRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/waste-buyers/:id', async (req, res) => {
  try {
    const r = await q('SELECT waste_buyers.*, users.phone AS phone FROM waste_buyers LEFT JOIN users ON users.id = waste_buyers.user_id WHERE waste_buyers.id = $1', [req.params.id]);
    const wb = r.rows[0] ? wbRow(r.rows[0]) : null;
    if (!wb) return res.status(404).json({ error: 'Not found' });
    res.json(wb);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/waste-buyers', auth, async (req, res) => {
  try {
    const { name, city, district, about, priceTermo, pricePvxOq, pricePvxRangli, priceAlyumin, priceAlikabond, lat, lng, telegram } = req.body || {};
    if (!name || !city || !district) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const existing = await q('SELECT id FROM waste_buyers WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE waste_buyers SET name=$1,city=$2,district=$3,about=$4,price_termo=$5,price_pvx_oq=$6,price_pvx_rangli=$7,price_alyumin=$8,price_alikabond=$9,lat=$10,lng=$11,telegram=$12 WHERE user_id=$13`,
        [name, city, district, about || '', priceTermo || 0, pricePvxOq || 0, pricePvxRangli || 0, priceAlyumin || 0, priceAlikabond || 0, lat ?? null, lng ?? null, tg, req.user.id]);
      const r = await q('SELECT * FROM waste_buyers WHERE user_id=$1', [req.user.id]);
      return res.json(wbRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO waste_buyers (user_id,name,city,district,about,price_termo,price_pvx_oq,price_pvx_rangli,price_alyumin,price_alikabond,lat,lng,telegram)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [req.user.id, name, city, district, about || '', priceTermo || 0, pricePvxOq || 0, pricePvxRangli || 0, priceAlyumin || 0, priceAlikabond || 0, lat ?? null, lng ?? null, tg]);
    const wr = await q('SELECT * FROM waste_buyers WHERE id=$1', [r.rows[0].id]);
    res.json(wbRow(wr.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/waste-buyers', auth, async (req, res) => {
  try {
    await q('DELETE FROM waste_buyers WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT usluga_providers.*, users.phone AS phone FROM usluga_providers LEFT JOIN users ON users.id = usluga_providers.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (spec) { sql += ` AND specs ILIKE $${n++}`; params.push(`%"${spec}"%`); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY verified DESC, usluga_providers.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(upRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/usluga/:id', async (req, res) => {
  try {
    const r = await q('SELECT usluga_providers.*, users.phone AS phone FROM usluga_providers LEFT JOIN users ON users.id = usluga_providers.user_id WHERE usluga_providers.id = $1', [req.params.id]);
    const u = r.rows[0] ? upRow(r.rows[0]) : null;
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// === STANOK REMONT ===
const smRow = (r) => {
  if (!r) return r;
  if (typeof r.specs === 'string') r.specs = JSON.parse(r.specs);
  if ('verified' in r) r.verified = !!r.verified;
  if ('urgent' in r) r.urgent = !!r.urgent;
  if ('price_diagnostika' in r) { r.priceDiagnostika = r.price_diagnostika; delete r.price_diagnostika; }
  if ('price_charxlash' in r) { r.priceCharxlash = r.price_charxlash; delete r.price_charxlash; }
  return r;
};

app.get('/api/stanok', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT stanok_masters.*, users.phone AS phone FROM stanok_masters LEFT JOIN users ON users.id = stanok_masters.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (spec) { sql += ` AND specs ILIKE $${n++}`; params.push(`%"${spec}"%`); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY verified DESC, stanok_masters.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(smRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/stanok/:id', async (req, res) => {
  try {
    const r = await q('SELECT stanok_masters.*, users.phone AS phone FROM stanok_masters LEFT JOIN users ON users.id = stanok_masters.user_id WHERE stanok_masters.id = $1', [req.params.id]);
    const m = r.rows[0] ? smRow(r.rows[0]) : null;
    if (!m) return res.status(404).json({ error: 'Not found' });
    res.json(m);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/stanok', auth, async (req, res) => {
  try {
    const { name, city, district, about, specs, priceDiagnostika, priceCharxlash, urgent, experience, lat, lng, telegram } = req.body || {};
    if (!name || !city || !district || !specs || specs.length === 0) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const existing = await q('SELECT id FROM stanok_masters WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE stanok_masters SET name=$1,city=$2,district=$3,about=$4,specs=$5,price_diagnostika=$6,urgent=$7,experience=$8,lat=$9,lng=$10,telegram=$11,price_charxlash=$12 WHERE user_id=$13`,
        [name, city, district, about || '', JSON.stringify(specs), priceDiagnostika || 0, urgent ? 1 : 0, experience || '', lat ?? null, lng ?? null, tg, priceCharxlash || 0, req.user.id]);
      const r = await q('SELECT * FROM stanok_masters WHERE user_id=$1', [req.user.id]);
      return res.json(smRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO stanok_masters (user_id,name,city,district,about,specs,price_diagnostika,urgent,experience,lat,lng,telegram,price_charxlash)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [req.user.id, name, city, district, about || '', JSON.stringify(specs), priceDiagnostika || 0, urgent ? 1 : 0, experience || '', lat ?? null, lng ?? null, tg, priceCharxlash || 0]);
    const mr = await q('SELECT * FROM stanok_masters WHERE id=$1', [r.rows[0].id]);
    res.json(smRow(mr.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/stanok', auth, async (req, res) => {
  try {
    await q('DELETE FROM stanok_masters WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/usluga', auth, async (req, res) => {
  try {
    await q('DELETE FROM usluga_providers WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// === DOSTAVKA (DELIVERY DRIVERS) ===
const ddRow = (r) => {
  if (!r) return r;
  if ('verified' in r) r.verified = !!r.verified;
  if ('is_custom_vehicle' in r) { r.isCustomVehicle = !!r.is_custom_vehicle; delete r.is_custom_vehicle; }
  if ('vehicle_model' in r) { r.vehicleModel = r.vehicle_model; delete r.vehicle_model; }
  if ('vehicle_image_url' in r) { r.vehicleImageUrl = r.vehicle_image_url; delete r.vehicle_image_url; }
  return r;
};

app.get('/api/delivery', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT delivery_drivers.*, users.phone AS phone FROM delivery_drivers LEFT JOIN users ON users.id = delivery_drivers.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (spec) { sql += ` AND vehicle_model = $${n++}`; params.push(spec); }
    if (qr) { sql += ` AND (name ILIKE $${n} OR about ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY verified DESC, delivery_drivers.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(ddRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/delivery/:id', async (req, res) => {
  try {
    const r = await q('SELECT delivery_drivers.*, users.phone AS phone FROM delivery_drivers LEFT JOIN users ON users.id = delivery_drivers.user_id WHERE delivery_drivers.id = $1', [req.params.id]);
    const d = r.rows[0] ? ddRow(r.rows[0]) : null;
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/delivery', auth, uploadImage, async (req, res) => {
  try {
    const b = req.body || {};
    const name = b.name;
    const city = b.city;
    const district = b.district;
    const vehicleModel = b.vehicleModel;
    if (!name || !city || !district || !vehicleModel) return res.status(400).json({ error: 'Missing fields' });
    const isCustomVehicle = b.isCustomVehicle === 'true' || b.isCustomVehicle === true || b.isCustomVehicle === 1 || b.isCustomVehicle === '1' ? 1 : 0;
    const about = b.about || '';
    const tg = b.telegram ? String(b.telegram).replace(/^@/, '').trim() : null;
    const lat = b.lat !== undefined && b.lat !== '' && b.lat !== null ? Number(b.lat) : null;
    const lng = b.lng !== undefined && b.lng !== '' && b.lng !== null ? Number(b.lng) : null;

    const existing = await q('SELECT id, vehicle_image_url, is_custom_vehicle FROM delivery_drivers WHERE user_id = $1', [req.user.id]);
    let vehicleImageUrl = null;
    if (req.file) {
      vehicleImageUrl = `/uploads/${req.file.filename}`;
    } else if (existing.rows.length) {
      vehicleImageUrl = existing.rows[0].vehicle_image_url;
    }
    if (!isCustomVehicle && !req.file) {
      vehicleImageUrl = null;
    }

    if (existing.rows.length) {
      // delete old custom image if replaced or no longer custom
      const oldUrl = existing.rows[0].vehicle_image_url;
      const oldCustom = !!existing.rows[0].is_custom_vehicle;
      if (oldCustom && oldUrl && oldUrl !== vehicleImageUrl && oldUrl.startsWith('/uploads/')) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(oldUrl))); } catch (_) {}
      }
      await q(`UPDATE delivery_drivers SET name=$1,city=$2,district=$3,vehicle_model=$4,is_custom_vehicle=$5,vehicle_image_url=$6,about=$7,lat=$8,lng=$9,telegram=$10 WHERE user_id=$11`,
        [name, city, district, vehicleModel, isCustomVehicle, vehicleImageUrl, about, lat, lng, tg, req.user.id]);
      const r = await q('SELECT * FROM delivery_drivers WHERE user_id=$1', [req.user.id]);
      return res.json(ddRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO delivery_drivers (user_id,name,city,district,vehicle_model,is_custom_vehicle,vehicle_image_url,about,lat,lng,telegram)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [req.user.id, name, city, district, vehicleModel, isCustomVehicle, vehicleImageUrl, about, lat, lng, tg]);
    const dr = await q('SELECT * FROM delivery_drivers WHERE id=$1', [r.rows[0].id]);
    res.json(ddRow(dr.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/delivery', auth, async (req, res) => {
  try {
    const existing = await q('SELECT vehicle_image_url, is_custom_vehicle FROM delivery_drivers WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      const oldUrl = existing.rows[0].vehicle_image_url;
      const oldCustom = !!existing.rows[0].is_custom_vehicle;
      if (oldCustom && oldUrl && oldUrl.startsWith('/uploads/')) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(oldUrl))); } catch (_) {}
      }
    }
    await q('DELETE FROM delivery_drivers WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// === STANOK ELONLAR (MARKETPLACE) ===
const saRow = (r) => {
  if (!r) return r;
  if ('verified' in r) r.verified = !!r.verified;
  if ('stanok_type' in r) { r.stanokType = r.stanok_type; delete r.stanok_type; }
  if ('image_url' in r) { r.imageUrl = r.image_url; delete r.image_url; }
  return r;
};

app.get('/api/stanok-ads', async (req, res) => {
  try {
    const { city, condition, type, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT stanok_ads.*, users.phone AS phone FROM stanok_ads LEFT JOIN users ON users.id = stanok_ads.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (condition) { sql += ` AND condition = $${n++}`; params.push(condition); }
    if (type) { sql += ` AND stanok_type = $${n++}`; params.push(type); }
    if (qr) { sql += ` AND (title ILIKE $${n} OR description ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY verified DESC, stanok_ads.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(saRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/stanok-ads/:id', async (req, res) => {
  try {
    const r = await q('SELECT stanok_ads.*, users.phone AS phone FROM stanok_ads LEFT JOIN users ON users.id = stanok_ads.user_id WHERE stanok_ads.id = $1', [req.params.id]);
    const a = r.rows[0] ? saRow(r.rows[0]) : null;
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/stanok-ads', auth, uploadImage, async (req, res) => {
  try {
    const b = req.body || {};
    const title = b.title;
    const condition = b.condition;
    const description = b.description;
    const city = b.city;
    const district = b.district;
    if (!title || !condition || !description || !city || !district) return res.status(400).json({ error: 'Missing fields' });
    const stanokType = b.stanokType || null;
    const price = b.price !== undefined && b.price !== '' && b.price !== null ? Number(b.price) : 0;
    const tg = b.telegram ? String(b.telegram).replace(/^@/, '').trim() : null;
    const lat = b.lat !== undefined && b.lat !== '' && b.lat !== null ? Number(b.lat) : null;
    const lng = b.lng !== undefined && b.lng !== '' && b.lng !== null ? Number(b.lng) : null;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const r = await q(`INSERT INTO stanok_ads (user_id,title,stanok_type,condition,price,image_url,description,city,district,lat,lng,telegram)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [req.user.id, title, stanokType, condition, price, imageUrl, description, city, district, lat, lng, tg]);
    const ar = await q('SELECT * FROM stanok_ads WHERE id=$1', [r.rows[0].id]);
    res.json(saRow(ar.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.patch('/api/stanok-ads/:id', auth, uploadImage, async (req, res) => {
  try {
    const ar = await q('SELECT * FROM stanok_ads WHERE id=$1', [req.params.id]);
    const ad = ar.rows[0];
    if (!ad) return res.status(404).json({ error: 'Not found' });
    if (ad.user_id !== req.user.id) return res.status(403).json({ error: 'Not your ad' });
    const b = req.body || {};
    const map = { title: 'title', stanokType: 'stanok_type', condition: 'condition', price: 'price', description: 'description', city: 'city', district: 'district', lat: 'lat', lng: 'lng', telegram: 'telegram' };
    const fields = [], vals = [];
    let n = 1;
    for (const k in map) {
      if (k in b) {
        let v = b[k];
        if (k === 'telegram' && v) v = String(v).replace(/^@/, '').trim();
        if ((k === 'lat' || k === 'lng') && (v === '' || v === null || v === undefined)) v = null;
        else if (k === 'lat' || k === 'lng') v = Number(v);
        if (k === 'price' && v !== null && v !== undefined && v !== '') v = Number(v);
        fields.push(`${map[k]}=$${n++}`); vals.push(v);
      }
    }
    if (req.file) {
      // delete old image if existed
      if (ad.image_url && ad.image_url.startsWith('/uploads/')) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(ad.image_url))); } catch (_) {}
      }
      fields.push(`image_url=$${n++}`); vals.push(`/uploads/${req.file.filename}`);
    }
    if (fields.length === 0) return res.json(saRow(ad));
    vals.push(req.params.id);
    await q(`UPDATE stanok_ads SET ${fields.join(',')} WHERE id=$${n}`, vals);
    const r2 = await q('SELECT * FROM stanok_ads WHERE id=$1', [req.params.id]);
    res.json(saRow(r2.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/stanok-ads/:id', auth, async (req, res) => {
  try {
    const ar = await q('SELECT * FROM stanok_ads WHERE id=$1', [req.params.id]);
    const ad = ar.rows[0];
    if (!ad) return res.status(404).json({ error: 'Not found' });
    if (ad.user_id !== req.user.id) return res.status(403).json({ error: 'Not your ad' });
    if (ad.image_url && ad.image_url.startsWith('/uploads/')) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(ad.image_url))); } catch (_) {}
    }
    await q('DELETE FROM stanok_ads WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/me/stanok-ads', auth, async (req, res) => {
  try {
    const r = await q('SELECT * FROM stanok_ads WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    res.json(r.rows.map(saRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// === USTANOFKA BRIGADALAR ===
const ibRow = (r) => {
  if (!r) return r;
  if (typeof r.specs === 'string') r.specs = JSON.parse(r.specs);
  if ('verified' in r) r.verified = !!r.verified;
  if ('team_size' in r) { r.teamSize = r.team_size; delete r.team_size; }
  if ('price_termo' in r) { r.priceTermo = r.price_termo; delete r.price_termo; }
  if ('price_pvx' in r) { r.pricePvx = r.price_pvx; delete r.price_pvx; }
  if ('price_alyumin' in r) { r.priceAlyumin = r.price_alyumin; delete r.price_alyumin; }
  if ('price_jp_fasad' in r) { r.priceJpFasad = r.price_jp_fasad; delete r.price_jp_fasad; }
  return r;
};

app.get('/api/install-brigada', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT install_brigades.*, users.phone AS phone FROM install_brigades LEFT JOIN users ON users.id = install_brigades.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (spec) { sql += ` AND specs ILIKE $${n++}`; params.push(`%"${spec}"%`); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY verified DESC, install_brigades.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(ibRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/install-brigada/:id', async (req, res) => {
  try {
    const r = await q('SELECT install_brigades.*, users.phone AS phone FROM install_brigades LEFT JOIN users ON users.id = install_brigades.user_id WHERE install_brigades.id = $1', [req.params.id]);
    const b = r.rows[0] ? ibRow(r.rows[0]) : null;
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/install-brigada', auth, async (req, res) => {
  try {
    const { name, city, district, about, specs, teamSize, experience, priceTermo, pricePvx, priceAlyumin, priceJpFasad, lat, lng, telegram } = req.body || {};
    if (!name || !city || !district || !specs || specs.length === 0) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const existing = await q('SELECT id FROM install_brigades WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE install_brigades SET name=$1,city=$2,district=$3,about=$4,specs=$5,team_size=$6,experience=$7,price_termo=$8,price_pvx=$9,price_alyumin=$10,lat=$11,lng=$12,telegram=$13,price_jp_fasad=$14 WHERE user_id=$15`,
        [name, city, district, about || '', JSON.stringify(specs), teamSize || 1, experience || '', priceTermo || 0, pricePvx || 0, priceAlyumin || 0, lat ?? null, lng ?? null, tg, priceJpFasad || 0, req.user.id]);
      const r = await q('SELECT * FROM install_brigades WHERE user_id=$1', [req.user.id]);
      return res.json(ibRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO install_brigades (user_id,name,city,district,about,specs,team_size,experience,price_termo,price_pvx,price_alyumin,lat,lng,telegram,price_jp_fasad)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [req.user.id, name, city, district, about || '', JSON.stringify(specs), teamSize || 1, experience || '', priceTermo || 0, pricePvx || 0, priceAlyumin || 0, lat ?? null, lng ?? null, tg, priceJpFasad || 0]);
    const br = await q('SELECT * FROM install_brigades WHERE id=$1', [r.rows[0].id]);
    res.json(ibRow(br.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/install-brigada', auth, async (req, res) => {
  try {
    await q('DELETE FROM install_brigades WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// === ARKACHILAR ===
const akRow = (r) => {
  if (!r) return r;
  if (typeof r.specs === 'string') r.specs = JSON.parse(r.specs);
  if ('verified' in r) r.verified = !!r.verified;
  if ('price_termo' in r) { r.priceTermo = r.price_termo; delete r.price_termo; }
  if ('price_pvx' in r) { r.pricePvx = r.price_pvx; delete r.price_pvx; }
  if ('price_alyumin' in r) { r.priceAlyumin = r.price_alyumin; delete r.price_alyumin; }
  if ('price_jp_fasad' in r) { r.priceJpFasad = r.price_jp_fasad; delete r.price_jp_fasad; }
  return r;
};

app.get('/api/arkachilar', async (req, res) => {
  try {
    const { city, spec, q: qr } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let sql = 'SELECT arkachilar.*, users.phone AS phone FROM arkachilar LEFT JOIN users ON users.id = arkachilar.user_id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) { sql += ` AND city = $${n++}`; params.push(city); }
    if (spec) { sql += ` AND specs ILIKE $${n++}`; params.push(`%"${spec}"%`); }
    if (qr) { sql += ` AND (name ILIKE $${n})`; params.push(`%${qr}%`); n++; }
    sql += ` ORDER BY verified DESC, arkachilar.id DESC LIMIT $${n++} OFFSET $${n++}`;
    params.push(limit, offset);
    const r = await q(sql, params);
    res.json(r.rows.map(akRow));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.get('/api/arkachilar/:id', async (req, res) => {
  try {
    const r = await q('SELECT arkachilar.*, users.phone AS phone FROM arkachilar LEFT JOIN users ON users.id = arkachilar.user_id WHERE arkachilar.id = $1', [req.params.id]);
    const a = r.rows[0] ? akRow(r.rows[0]) : null;
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.post('/api/arkachilar', auth, async (req, res) => {
  try {
    const { name, city, district, about, specs, experience, priceTermo, pricePvx, priceAlyumin, priceJpFasad, lat, lng, telegram } = req.body || {};
    if (!name || !city || !district || !specs || specs.length === 0) return res.status(400).json({ error: 'Missing fields' });
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const existing = await q('SELECT id FROM arkachilar WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await q(`UPDATE arkachilar SET name=$1,city=$2,district=$3,about=$4,specs=$5,experience=$6,price_termo=$7,price_pvx=$8,price_alyumin=$9,price_jp_fasad=$10,lat=$11,lng=$12,telegram=$13 WHERE user_id=$14`,
        [name, city, district, about || '', JSON.stringify(specs), experience || '', priceTermo || 0, pricePvx || 0, priceAlyumin || 0, priceJpFasad || 0, lat ?? null, lng ?? null, tg, req.user.id]);
      const r = await q('SELECT * FROM arkachilar WHERE user_id=$1', [req.user.id]);
      return res.json(akRow(r.rows[0]));
    }
    const r = await q(`INSERT INTO arkachilar (user_id,name,city,district,about,specs,experience,price_termo,price_pvx,price_alyumin,price_jp_fasad,lat,lng,telegram)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [req.user.id, name, city, district, about || '', JSON.stringify(specs), experience || '', priceTermo || 0, pricePvx || 0, priceAlyumin || 0, priceJpFasad || 0, lat ?? null, lng ?? null, tg]);
    const ar = await q('SELECT * FROM arkachilar WHERE id=$1', [r.rows[0].id]);
    res.json(akRow(ar.rows[0]));
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

app.delete('/api/arkachilar', auth, async (req, res) => {
  try {
    await q('DELETE FROM arkachilar WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
});

// /api/me ga profillar qo'shish
app.get('/api/me/profiles', auth, async (req, res) => {
  try {
    const worker = await q('SELECT * FROM workers WHERE user_id = $1', [req.user.id]);
    const wb = await q('SELECT * FROM waste_buyers WHERE user_id = $1', [req.user.id]);
    const up = await q('SELECT * FROM usluga_providers WHERE user_id = $1', [req.user.id]);
    const sm = await q('SELECT * FROM stanok_masters WHERE user_id = $1', [req.user.id]);
    const dd = await q('SELECT * FROM delivery_drivers WHERE user_id = $1', [req.user.id]);
    const ib = await q('SELECT * FROM install_brigades WHERE user_id = $1', [req.user.id]);
    const ak = await q('SELECT * FROM arkachilar WHERE user_id = $1', [req.user.id]);
    res.json({
      worker: worker.rows[0] ? row(worker.rows[0]) : null,
      wasteBuyer: wb.rows[0] ? wbRow(wb.rows[0]) : null,
      usluga: up.rows[0] ? upRow(up.rows[0]) : null,
      stanok: sm.rows[0] ? smRow(sm.rows[0]) : null,
      delivery: dd.rows[0] ? ddRow(dd.rows[0]) : null,
      installBrigada: ib.rows[0] ? ibRow(ib.rows[0]) : null,
      arkachi: ak.rows[0] ? akRow(ak.rows[0]) : null,
    });
  } catch (e) { req.log.error({ err: e }, 'request failed'); res.status(500).json({ error: e.message }); }
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

  // Seed delivery drivers
  const ddr = await q('SELECT COUNT(*) as c FROM delivery_drivers');
  if (parseInt(ddr.rows[0].c) === 0) {
    const drivers = [
      { name: 'Akmal Damas', city: 'Toshkent', district: 'Chilonzor', vehicle_model: 'Damas', is_custom_vehicle: 0, about: 'Toshkent boylab. Tez va arzon.', verified: 1 },
      { name: 'Bekzod Labo', city: 'Toshkent', district: 'Yashnobod', vehicle_model: 'Labo', is_custom_vehicle: 0, about: 'Yuk tashish, kichik mebellar.', verified: 1 },
      { name: 'Sardor Gazel', city: 'Toshkent', district: 'Sergeli', vehicle_model: 'Gazel', is_custom_vehicle: 0, about: 'Katta yuklar, ko\'chish.', verified: 0 },
    ];
    const h = bcrypt.hashSync('demo1234', 10);
    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[i];
      const ur = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [`+99893999000${i + 1}`, h, 'delivery']);
      await q(`INSERT INTO delivery_drivers (user_id,name,city,district,vehicle_model,is_custom_vehicle,about,verified)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ur.rows[0].id, d.name, d.city, d.district, d.vehicle_model, d.is_custom_vehicle, d.about, d.verified]);
    }
    logger.info('Seeded delivery drivers');
  }

  // Seed install brigadas
  const ibr = await q('SELECT COUNT(*) as c FROM install_brigades');
  if (parseInt(ibr.rows[0].c) === 0) {
    const h = bcrypt.hashSync('demo1234', 10);
    const sampleIB = [
      { name: 'Ustanofka Brigada Aziz', city: 'Toshkent', district: 'Yashnobod', specs: ['PVX', 'Termo'], team_size: 4, experience: '5+ yil', about: 'Tayyor PVX va Termo eshik-derazalarni o\'rnatib beramiz. Toshkent bo\'ylab.', price_termo: 35000, price_pvx: 40000, price_alyumin: 0, verified: 1 },
      { name: 'Master Romchi Ustanofka', city: 'Toshkent', district: 'Sergeli', specs: ['Alyumin', 'PVX'], team_size: 3, experience: '3-5 yil', about: 'Alyumin fasad va PVX deraza ustanofkasi. Sifatli, kafolatli.', price_termo: 0, price_pvx: 38000, price_alyumin: 55000, verified: 1 },
      { name: 'Brigada Bekzod', city: 'Toshkent', district: 'Chilonzor', specs: ['Termo', 'PVX', 'Alyumin'], team_size: 5, experience: '5+ yil', about: 'Barcha turdagi rom va eshiklarni o\'rnatamiz. Tez va arzon.', price_termo: 32000, price_pvx: 36000, price_alyumin: 50000, verified: 0 },
    ];
    for (let i = 0; i < sampleIB.length; i++) {
      const b = sampleIB[i];
      const ur = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [`+99894000000${i + 1}`, h, 'install']);
      await q(`INSERT INTO install_brigades (user_id,name,city,district,about,specs,team_size,experience,price_termo,price_pvx,price_alyumin,verified)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [ur.rows[0].id, b.name, b.city, b.district, b.about, JSON.stringify(b.specs), b.team_size, b.experience, b.price_termo, b.price_pvx, b.price_alyumin, b.verified]);
    }
    logger.info('Seeded install brigades');
  }

  // Seed arkachilar
  const akr = await q('SELECT COUNT(*) as c FROM arkachilar');
  if (parseInt(akr.rows[0].c) === 0) {
    const h = bcrypt.hashSync('demo1234', 10);
    const sampleAK = [
      { name: 'Arkachi Usta Davron', city: 'Toshkent', district: 'Sergeli', specs: ['PVX', 'Termo'], experience: '5+ yil', about: 'PVX va Termo profillarni ark shaklida tayyorlaymiz. Tez va sifatli.', price_termo: 30000, price_pvx: 28000, price_alyumin: 0, price_jp_fasad: 0, verified: 1 },
      { name: 'Master Ark Sex', city: 'Toshkent', district: 'Chilonzor', specs: ['Alyumin', 'JP fasad', 'PVX'], experience: '3-5 yil', about: 'Alyumin va JP fasad arklari. Har xil radius.', price_termo: 0, price_pvx: 30000, price_alyumin: 45000, price_jp_fasad: 55000, verified: 1 },
      { name: 'Ustaxona Arka Pro', city: 'Toshkent', district: 'Yashnobod', specs: ['Termo', 'PVX', 'Alyumin', 'JP fasad'], experience: '5+ yil', about: 'Barcha turdagi profillar uchun ark egish xizmati.', price_termo: 28000, price_pvx: 26000, price_alyumin: 42000, price_jp_fasad: 52000, verified: 0 },
    ];
    for (let i = 0; i < sampleAK.length; i++) {
      const a = sampleAK[i];
      const ur = await q('INSERT INTO users (phone, password_hash, role) VALUES ($1,$2,$3) RETURNING id', [`+99895000000${i + 1}`, h, 'arkachi']);
      await q(`INSERT INTO arkachilar (user_id,name,city,district,about,specs,experience,price_termo,price_pvx,price_alyumin,price_jp_fasad,verified)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [ur.rows[0].id, a.name, a.city, a.district, a.about, JSON.stringify(a.specs), a.experience, a.price_termo, a.price_pvx, a.price_alyumin, a.price_jp_fasad, a.verified]);
    }
    logger.info('Seeded arkachilar');
  }

  // Seed stanok ads (marketplace)
  const sar = await q('SELECT COUNT(*) as c FROM stanok_ads');
  if (parseInt(sar.rows[0].c) === 0) {
    const u = await q("SELECT id FROM users WHERE role = 'stanok' LIMIT 1");
    if (u.rows.length) {
      const uid = u.rows[0].id;
      const ads = [
        { title: 'Yangi Frezerlash stanogi (Toshkent)', stanok_type: 'Frezerlash stanogi', condition: 'new', price: 25000000, description: 'Yangi, kafolat bilan. CNC boshqaruvi.', city: 'Toshkent', district: 'Chilonzor' },
        { title: 'Ishlatilgan Kompressor 200L', stanok_type: 'Kompressor', condition: 'used', price: 4500000, description: '3 yil ishlatilgan, holati a\'lo. Sertifikat bor.', city: 'Toshkent', district: 'Yashnobod' },
        { title: 'Pressovka stanogi 50 tonna', stanok_type: 'Pressovka stanogi', condition: 'used', price: 18000000, description: 'Sanoat uchun. Toshkent shahri.', city: 'Toshkent', district: 'Sergeli' },
      ];
      for (const ad of ads) {
        await q(`INSERT INTO stanok_ads (user_id,title,stanok_type,condition,price,description,city,district,verified) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)`,
          [uid, ad.title, ad.stanok_type, ad.condition, ad.price, ad.description, ad.city, ad.district]);
      }
      logger.info('Seeded stanok ads');
    }
  }
}

const buildDir = process.env.DATABASE_URL ? path.join(__dirname, '..', 'build') : path.join(__dirname, '..', '..', 'build');
app.use(express.static(buildDir));
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(buildDir, 'index.html')));

init().then(() => seed()).then(() => {
  app.listen(PORT, '0.0.0.0', () => logger.info({ port: PORT }, 'Romchi backend started'));
}).catch(e => { console.error('DB init failed:', e); process.exit(1); });
