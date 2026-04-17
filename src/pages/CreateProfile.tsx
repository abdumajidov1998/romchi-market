import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Input } from '../ui';
import { cities, regions } from '../data';
import { SpecIcon } from '../SpecIcon';
import { api, auth } from '../api';
import { MapPicker } from '../components/MapPicker';

const SPECS = ['Termo', 'PVX', 'Alyumin'];
const RED = '#DC2626';
const RED_50 = '#FEE2E2';

export const CreateProfile: React.FC = () => {
  const nav = useNavigate();
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('+998 ');
  const [password, setPassword] = React.useState('');
  const [city, setCity] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [exp, setExp] = React.useState<string>('');
  const [about, setAbout] = React.useState('');
  const [salaryFrom, setSalaryFrom] = React.useState('');
  const [salaryTo, setSalaryTo] = React.useState('');
  const [telegram, setTelegram] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [attempted, setAttempted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const toggle = (s: string) =>
    setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  const ok = {
    1: name.trim().length > 1,
    2: phone.replace(/\D/g, '').length >= 9,
    3: password.length >= 4,
    4: city.length > 0,
    5: district.length > 0,
    6: !!coords,
    7: specs.length > 0,
    8: exp.length > 0,
  };
  const canSave = Object.values(ok).every(Boolean);
  const missingCount = Object.values(ok).filter(v => !v).length;

  type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  const showErr = (step: Step) => attempted && !ok[step];

  const SectionTitle: React.FC<{ n: Step; title: string; hint?: string }> = ({ n, title, hint }) => {
    const done = ok[n];
    const err = showErr(n);
    const bg = err ? RED : done ? 'var(--green)' : 'var(--blue)';
    return (
      <div style={{ margin: '22px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: bg, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>
            {done ? '✓' : err ? '!' : n}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, color: err ? RED : 'var(--ink)' }}>{title}</div>
        </div>
        {err ? (
          <div style={{ color: RED, fontSize: 13, marginTop: 4, marginLeft: 36, fontWeight: 500 }}>Bu qadam to‘ldirilmagan</div>
        ) : hint ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, marginLeft: 36 }}>{hint}</div>
        ) : null}
      </div>
    );
  };

  const errBorder = (err: boolean) => err ? { borderColor: RED, boxShadow: `0 0 0 4px ${RED_50}` } : {};

  const submit = async () => {
    if (!canSave) { setAttempted(true); return; }
    setError('');
    setSaving(true);
    try {
      const cleanPhone = phone.replace(/\s/g, '');
      const res = await api.register({
        phone: cleanPhone, password, role: 'worker',
        name: name.trim(), city, district, specs, experience: exp, about: about.trim(),
        lat: coords?.lat, lng: coords?.lng,
        salaryFrom: salaryFrom ? Number(salaryFrom.replace(/\D/g, '')) : undefined,
        salaryTo: salaryTo ? Number(salaryTo.replace(/\D/g, '')) : undefined,
        telegram: telegram.trim() || undefined,
      });
      auth.set(res.token, res.user);
      nav('/jobs');
    } catch (e: any) {
      if (String(e.message).toLowerCase().includes('already')) {
        try {
          const res = await api.login(phone.replace(/\s/g, ''), password);
          auth.set(res.token, res.user);
          await api.saveWorker({ name: name.trim(), city, district, specs, experience: exp, about: about.trim(), lat: coords?.lat, lng: coords?.lng });
          nav('/jobs');
          return;
        } catch (e2: any) {
          setError('Bu telefon ro‘yxatdan o‘tgan, parol noto‘g‘ri. Boshqa raqam kiriting yoki to‘g‘ri parolni yozing.');
        }
      } else {
        setError(e.message || 'Xatolik yuz berdi');
      }
    } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 18 }}>←</button>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--muted)' }}>Ishchi profili</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15 }}>O‘zingiz haqingizda ayting</div>
      <p style={{ color: 'var(--muted)', margin: '6px 0 4px', fontSize: 15 }}>Bir daqiqa ichida profil yaratiladi. Ish beruvchilar sizni topadi.</p>

      {attempted && !canSave && (
        <div style={{
          marginTop: 14, padding: 14, background: RED_50, borderRadius: 14,
          color: RED, fontSize: 14, fontWeight: 600, display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>{missingCount} ta qadam to‘ldirilmagan. Qizil belgilangan joylarni to‘ldiring.</div>
        </div>
      )}

      <SectionTitle n={1} title="Ismingiz" />
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Akmal" style={{ fontSize: 17, padding: '16px 16px', ...errBorder(showErr(1)) }} />

      <SectionTitle n={2} title="Telefon raqam" hint="Ish beruvchilar shu raqamga qo‘ng‘iroq qilishadi" />
      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 __ ___ __ __" style={{ fontSize: 17, padding: '16px 16px', ...errBorder(showErr(2)) }} />

      <SectionTitle n={3} title="Maxfiy so‘z (parol)" hint="Keyinchalik shu parol bilan kirasiz. Kamida 4 belgi." />
      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Parol kiriting" style={{ fontSize: 17, padding: '16px 16px', ...errBorder(showErr(3)) }} />

      <SectionTitle n={4} title="Qaysi viloyatda ishlaysiz?" />
      <select
        value={city}
        onChange={e => pickCity(e.target.value)}
        style={{
          width: '100%', border: `1px solid ${showErr(4) ? RED : 'var(--line)'}`,
          background: showErr(4) ? RED_50 : '#fff', borderRadius: 14,
          padding: '16px 16px', fontSize: 16, fontWeight: 600, outline: 'none',
          appearance: 'none', cursor: 'pointer',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'><path d='M5 8l5 5 5-5' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 44,
          color: city ? 'var(--ink)' : 'var(--muted)',
        }}
      >
        <option value="" disabled>Viloyatni tanlang…</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <SectionTitle n={5} title="Qaysi tumanda?" hint={city ? `${city} tumanlaridan birini tanlang` : 'Avval viloyatni tanlang'} />
      <select
        value={district}
        onChange={e => setDistrict(e.target.value)}
        disabled={!city}
        style={{
          width: '100%', border: `1px solid ${showErr(5) ? RED : 'var(--line)'}`,
          background: showErr(5) ? RED_50 : city ? '#fff' : 'var(--bg)', borderRadius: 14,
          padding: '16px 16px', fontSize: 16, fontWeight: 600, outline: 'none',
          appearance: 'none', cursor: city ? 'pointer' : 'not-allowed',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'><path d='M5 8l5 5 5-5' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 44,
          color: district ? 'var(--ink)' : 'var(--muted)', opacity: city ? 1 : .6,
        }}
      >
        <option value="" disabled>{city ? 'Tumanni tanlang…' : 'Avval viloyatni tanlang'}</option>
        {city && regions[city].map(d => <option key={d} value={d}>📍 {d}</option>)}
      </select>

      <SectionTitle n={6} title="Aniq manzilni xaritada belgilang" hint={city && district ? 'Markerni kerakli joyga suring yoki xarita ustiga bosing' : 'Avval viloyat va tumanni tanlang'} />
      <div style={{
        ...(showErr(6) ? { padding: 6, borderRadius: 16, border: `1.5px dashed ${RED}`, background: RED_50 } : {}),
      }}>
        <MapPicker value={coords} onChange={setCoords} city={city} district={district} />
      </div>

      <SectionTitle n={7} title="Qanday ishlar qo‘lingizdan keladi?" hint="Bir nechtasini tanlashingiz mumkin" />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        ...(showErr(7) ? { padding: 10, borderRadius: 16, border: `1.5px dashed ${RED}`, background: RED_50 } : {}),
      }}>
        {SPECS.map(s => {
          const on = specs.includes(s);
          return (
            <button key={s} onClick={() => toggle(s)} style={{
              padding: '18px 8px', borderRadius: 16, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              position: 'relative',
            }}>
              <SpecIcon name={s} />
              <div style={{ fontWeight: 700, fontSize: 14, color: on ? 'var(--blue)' : 'var(--ink)' }}>{s}</div>
              {on && <div style={{
                position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 999,
                background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
              }}>✓</div>}
            </button>
          );
        })}
      </div>

      <SectionTitle n={8} title="Tajribangiz qancha?" />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        ...(showErr(8) ? { padding: 10, borderRadius: 14, border: `1.5px dashed ${RED}`, background: RED_50 } : {}),
      }}>
        {['1 yildan kam', '1–3 yil', '3–5 yil', '5+ yil'].map(e => (
          <button key={e} onClick={() => setExp(e)} style={{
            padding: '14px 6px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: exp === e ? 'var(--blue)' : '#fff', color: exp === e ? '#fff' : 'var(--ink-2)',
            border: `1px solid ${exp === e ? 'var(--blue)' : 'var(--line)'}`,
          }}>{e}</button>
        ))}
      </div>

      <div style={{ margin: '22px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: (salaryFrom && salaryTo) ? 'var(--green)' : 'var(--muted)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>
            {(salaryFrom && salaryTo) ? '✓' : '💰'}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Kutilayotgan maosh</div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, background: 'var(--bg)', padding: '3px 8px', borderRadius: 8 }}>Ixtiyoriy</span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, marginLeft: 36 }}>
          Misol uchun: 2 000 000 dan 6 000 000 so‘mgacha
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input value={salaryFrom} onChange={e => setSalaryFrom(e.target.value)} placeholder="2 000 000 (dan)" style={{ padding: '14px 16px', fontSize: 15 }} />
        <Input value={salaryTo} onChange={e => setSalaryTo(e.target.value)} placeholder="6 000 000 (gacha)" style={{ padding: '14px 16px', fontSize: 15 }} />
      </div>

      <div style={{ margin: '22px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: telegram.trim() ? 'var(--green)' : 'var(--muted)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>
            {telegram.trim() ? '✓' : '✈'}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Telegram username</div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, background: 'var(--bg)', padding: '3px 8px', borderRadius: 8 }}>Ixtiyoriy</span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, marginLeft: 36 }}>
          Masalan: akmal_pvx — brauzerdan ochilganda Telegram to‘g‘ridan-to‘g‘ri ochiladi
        </div>
      </div>
      <Input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username yoki username" style={{ padding: '14px 16px', fontSize: 15 }} />

      <div style={{ margin: '22px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: about.trim() ? 'var(--green)' : 'var(--muted)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>
            {about.trim() ? '✓' : '+'}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Qo‘shimcha ma'lumot</div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, background: 'var(--bg)', padding: '3px 8px', borderRadius: 8 }}>Ixtiyoriy</span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, marginLeft: 36 }}>
          O‘zingiz haqingizda qisqacha yozing — ish beruvchilar sizni yaxshiroq bilishadi
        </div>
      </div>
      <textarea
        value={about}
        onChange={e => setAbout(e.target.value)}
        maxLength={400}
        rows={4}
        placeholder="Masalan: O‘z asboblarim bor. Shahar bo‘ylab tayyorman. Uy-joy va ofis binolari uchun tajribam bor..."
        style={{
          width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14,
          padding: '14px 16px', fontSize: 15, lineHeight: 1.5, outline: 'none', resize: 'vertical',
          fontFamily: 'inherit', minHeight: 110,
        }}
      />
      <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        {about.length} / 400
      </div>

      <div style={{
        marginTop: 20, padding: 14, background: 'var(--blue-50)', borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 10, color: 'var(--blue)', fontSize: 13,
      }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div><b>Hamma narsa bepul.</b> Profil bir daqiqada tayyor, darhol ish topishni boshlaysiz.</div>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: 12, background: RED_50, borderRadius: 12, color: RED, fontSize: 13, fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      <Btn full onClick={submit} style={{ marginTop: 16, padding: '18px 16px', fontSize: 16, opacity: saving ? .6 : 1 }}>
        {saving ? 'Saqlanmoqda…' : 'Profilni saqlash →'}
      </Btn>

      <p style={{ textAlign: 'center', color: canSave ? 'var(--green)' : 'var(--muted)', fontSize: 12, marginTop: 12, fontWeight: 500 }}>
        {canSave ? '✓ Hammasi tayyor!' : `To‘ldirilgan: ${8 - missingCount} / 8`}
      </p>
    </div>
  );
};
