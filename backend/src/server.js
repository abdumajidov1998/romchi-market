const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

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

app.post('/api/auth/register', (req, res) => {
  const { phone, password, role, name, city, district, specs, experience, about, lat, lng, telegram, salaryFrom, salaryTo } = req.body || {};
  if (!phone || !password || !role) return res.status(400).json({ error: 'phone, password, role required' });
  if (!['worker', 'employer'].includes(role)) return res.status(400).json({ error: 'invalid role' });
  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) return res.status(409).json({ error: 'Phone already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const userRes = db.prepare('INSERT INTO users (phone, password_hash, role) VALUES (?,?,?)').run(phone, hash, role);
  const userId = userRes.lastInsertRowid;

  if (role === 'worker' && name && city && district && specs && experience) {
    const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
    const sFrom = salaryFrom ? Number(salaryFrom) : null;
    const sTo = salaryTo ? Number(salaryTo) : null;
    db.prepare(`INSERT INTO workers (user_id, name, city, district, specs, experience, about, lat, lng, telegram, salary_from, salary_to)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(userId, name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo);
  }

  const token = jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: userId, phone, role } });
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, phone: user.phone, role: user.role } });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, phone, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  let profile = null;
  if (user.role === 'worker') profile = row(db.prepare('SELECT * FROM workers WHERE user_id = ?').get(user.id));
  res.json({ user, profile });
});

app.get('/api/workers', (req, res) => {
  const { city, spec, q } = req.query;
  let sql = 'SELECT workers.*, users.phone AS phone FROM workers LEFT JOIN users ON users.id = workers.user_id WHERE 1=1';
  const params = [];
  if (city) { sql += ' AND city = ?'; params.push(city); }
  if (q) { sql += ' AND (name LIKE ? OR about LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY top DESC, rating DESC, workers.id DESC';
  let list = db.prepare(sql).all(...params).map(row);
  if (spec) list = list.filter(w => w.specs.includes(spec));
  res.json(list);
});

app.get('/api/workers/:id', (req, res) => {
  const w = row(db.prepare('SELECT workers.*, users.phone AS phone FROM workers LEFT JOIN users ON users.id = workers.user_id WHERE workers.id = ?').get(req.params.id));
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});

app.post('/api/workers', auth, (req, res) => {
  const { name, city, district, specs, experience, about, lat, lng, telegram, salaryFrom, salaryTo } = req.body || {};
  if (!name || !city || !district || !specs || !experience) return res.status(400).json({ error: 'Missing fields' });
  const tg = telegram ? String(telegram).replace(/^@/, '').trim() : null;
  const sFrom = salaryFrom ? Number(salaryFrom) : null;
  const sTo = salaryTo ? Number(salaryTo) : null;
  const existing = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(req.user.id);
  if (existing) {
    db.prepare(`UPDATE workers SET name=?, city=?, district=?, specs=?, experience=?, about=?, lat=?, lng=?, telegram=?, salary_from=?, salary_to=? WHERE user_id=?`)
      .run(name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo, req.user.id);
    return res.json(row(db.prepare('SELECT * FROM workers WHERE user_id=?').get(req.user.id)));
  }
  const r = db.prepare(`INSERT INTO workers (user_id, name, city, district, specs, experience, about, lat, lng, telegram, salary_from, salary_to)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.user.id, name, city, district, JSON.stringify(specs), experience, about || '', lat ?? null, lng ?? null, tg, sFrom, sTo);
  res.json(row(db.prepare('SELECT * FROM workers WHERE id=?').get(r.lastInsertRowid)));
});

app.get('/api/jobs', (req, res) => {
  const { city, spec, q } = req.query;
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];
  if (city) { sql += ' AND city = ?'; params.push(city); }
  if (q) { sql += ' AND (title LIKE ? OR company LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY id DESC';
  let list = db.prepare(sql).all(...params).map(row);
  if (spec) list = list.filter(j => j.specs.includes(spec));
  res.json(list);
});

app.get('/api/jobs/:id', (req, res) => {
  const j = row(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id));
  if (!j) return res.status(404).json({ error: 'Not found' });
  res.json(j);
});

app.patch('/api/jobs/:id', auth, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id=?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (job.user_id !== req.user.id) return res.status(403).json({ error: 'Not your job' });
  const b = req.body || {};
  const map = { title: 'title', company: 'company', type: 'type', workType: 'work_type', city: 'city', district: 'district', experience: 'experience', salaryFrom: 'salary_from', salaryTo: 'salary_to', description: 'description', badge: 'badge' };
  const fields = [], vals = [];
  for (const k in map) if (k in b) { fields.push(`${map[k]}=?`); vals.push(b[k]); }
  if ('specs' in b) { fields.push('specs=?'); vals.push(JSON.stringify(b.specs)); }
  if (fields.length === 0) return res.json(row(job));
  vals.push(req.params.id);
  db.prepare(`UPDATE jobs SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json(row(db.prepare('SELECT * FROM jobs WHERE id=?').get(req.params.id)));
});

app.delete('/api/jobs/:id', auth, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id=?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (job.user_id !== req.user.id) return res.status(403).json({ error: 'Not your job' });
  db.prepare('DELETE FROM jobs WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/jobs', auth, (req, res) => {
  const { title, company, type, workType, city, district, experience, salaryFrom, salaryTo, specs, description, badge } = req.body || {};
  if (!title || !company || !city || !district || !salaryFrom || !salaryTo || !specs) return res.status(400).json({ error: 'Missing fields' });
  const r = db.prepare(`INSERT INTO jobs (user_id, title, company, type, work_type, city, district, experience, salary_from, salary_to, specs, description, badge)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    req.user.id, title, company, type || 'Factory', workType || 'Full-time', city, district,
    experience || '', salaryFrom, salaryTo, JSON.stringify(specs), description || '', badge || null
  );
  res.json(row(db.prepare('SELECT * FROM jobs WHERE id=?').get(r.lastInsertRowid)));
});

// Auto-seed on empty DB so fresh deploy has visible content
(function seed() {
  const { workers: wc } = db.prepare('SELECT COUNT(*) as workers FROM workers').get();
  if (wc === 0) {
    const h = bcrypt.hashSync('demo1234', 10);
    const sampleWorkers = [
      { name: 'Sardor Rahimov', city: 'Toshkent', district: 'Yunusobod', specs: ['PVX', 'Termo'], experience: '5+ yil', about: '5 yillik PVX deraza yasash tajribasi. O‘z asboblari bor.', rating: 4.9, jobs_done: 87, verified: 1, top: 1 },
      { name: 'Jamshid Mirzoyev', city: 'Toshkent', district: 'Chilonzor', specs: ['Alyumin'], experience: '3–5 yil', about: 'Alyumin fasad bo‘yicha mutaxassis.', rating: 4.6, jobs_done: 34, verified: 0, top: 0 },
      { name: 'Bekzod Umarov', city: 'Toshkent', district: 'Mirzo Ulug‘bek', specs: ['PVX', 'Alyumin'], experience: '5+ yil', about: '7 yillik tajriba, aniq va tez.', rating: 5.0, jobs_done: 142, verified: 1, top: 1 },
      { name: 'Otabek Yusupov', city: 'Toshkent', district: 'Yashnobod', specs: ['Alyumin', 'Termo'], experience: '5+ yil', about: 'Alyumin eshiklar va vitrajli fasadlar.', rating: 4.8, jobs_done: 92, verified: 1, top: 1 },
    ];
    sampleWorkers.forEach((w, i) => {
      const u = db.prepare('INSERT INTO users (phone, password_hash, role) VALUES (?,?,?)').run(`+99890000000${i + 1}`, h, 'worker');
      db.prepare(`INSERT INTO workers (user_id,name,city,district,specs,experience,about,rating,jobs_done,verified,top)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(u.lastInsertRowid, w.name, w.city, w.district, JSON.stringify(w.specs), w.experience, w.about, w.rating, w.jobs_done, w.verified, w.top);
    });

    const empRes = db.prepare('INSERT INTO users (phone, password_hash, role) VALUES (?,?,?)').run('+998900000099', h, 'employer');
    const empId = empRes.lastInsertRowid;
    const sampleJobs = [
      { title: 'PVX deraza yasovchi usta', company: 'Oyna Plast MChJ', type: 'Factory', work_type: 'Full-time', city: 'Toshkent', district: 'Chilonzor', experience: '3+ yil', salary_from: 5000000, salary_to: 8000000, specs: ['PVX'], description: '3+ yil tajriba, o‘z asboblari kerak.', badge: 'New' },
      { title: 'Alyumin fasad yasovchi usta', company: 'AluTech', type: 'Workshop', work_type: 'Project', city: 'Toshkent', district: 'Yunusobod', experience: '5+ yil', salary_from: 9000000, salary_to: 12000000, specs: ['Alyumin'], description: 'Shoshilinch loyiha, 6 hafta.', badge: 'Top' },
      { title: 'Termo deraza yasovchi usta', company: 'Doors24', type: 'Factory', work_type: 'Part-time', city: 'Toshkent', district: 'Mirzo Ulug‘bek', experience: '2+ yil', salary_from: 3000000, salary_to: 5000000, specs: ['Termo'], description: 'Termo profil bo‘yicha usta.', badge: 'Verified' },
    ];
    sampleJobs.forEach(j => {
      db.prepare(`INSERT INTO jobs (user_id,title,company,type,work_type,city,district,experience,salary_from,salary_to,specs,description,badge)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(empId, j.title, j.company, j.type, j.work_type, j.city, j.district, j.experience, j.salary_from, j.salary_to, JSON.stringify(j.specs), j.description, j.badge);
    });
    console.log('Seeded sample data.');
  }
})();

const buildDir = path.join(__dirname, '..', 'build');
app.use(express.static(buildDir));
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(buildDir, 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Romchi backend on :${PORT}`));
