import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Btn, Card, Chip, Field, Input, Textarea } from '../ui';
import { allSpecs, cities, regions } from '../data';
import { SpecIcon } from '../SpecIcon';
import { api, auth } from '../api';
import { MapPicker } from '../components/MapPicker';

const WORK_MAP: Record<string, string> = { 'To‘liq stavka': 'Full-time', 'Yarim stavka': 'Part-time', 'Loyiha': 'Project' };
const WORK_MAP_REV: Record<string, string> = { 'Full-time': 'To‘liq stavka', 'Part-time': 'Yarim stavka', 'Project': 'Loyiha' };

export const PostJob: React.FC = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const isEdit = !!editId;

  const [adKind, setAdKind] = React.useState<'vakansiya' | 'ishchi'>('vakansiya');
  const [title, setTitle] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [salaryFrom, setSalaryFrom] = React.useState('');
  const [salaryTo, setSalaryTo] = React.useState('');
  const [city, setCity] = React.useState('Toshkent');
  const [district, setDistrict] = React.useState('');
  const [work, setWork] = React.useState('To‘liq stavka');
  const [description, setDescription] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');
  const [phone, setPhone] = React.useState('+998 ');
  const [password, setPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(isEdit);
  const [error, setError] = React.useState('');

  const toggle = (s: string) => setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  React.useEffect(() => {
    if (!isEdit || !editId) return;
    api.job(editId).then(j => {
      setTitle(j.title || '');
      setCompany(j.company || '');
      setSpecs(j.specs || []);
      setSalaryFrom(String(j.salaryFrom || ''));
      setSalaryTo(String(j.salaryTo || ''));
      setCity(j.city || 'Toshkent');
      setDistrict(j.district || '');
      setWork(WORK_MAP_REV[j.workType] || 'To‘liq stavka');
      setDescription(j.description || '');
      if (typeof j.lat === 'number' && typeof j.lng === 'number') setCoords({ lat: j.lat, lng: j.lng });
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [isEdit, editId]);

  const isAuthed = !!auth.token();

  const ensureAuth = async (): Promise<boolean> => {
    if (isAuthed) return true;
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.replace(/\D/g, '').length < 9 || password.length < 4) {
      setError('Telefon raqam va parolni to‘ldiring (parol kamida 4 belgi)');
      return false;
    }
    const role: 'worker' | 'employer' = adKind === 'ishchi' ? 'worker' : 'employer';
    try {
      const r = await api.register({ phone: cleanPhone, password, role });
      auth.set(r.token, r.user); return true;
    } catch (e: any) {
      if (String(e.message).toLowerCase().includes('already')) {
        try {
          const r = await api.login(cleanPhone, password);
          auth.set(r.token, r.user); return true;
        } catch { setError('Parol noto‘g‘ri'); return false; }
      }
      setError(e.message); return false;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (adKind === 'vakansiya') {
      if (!title || !company || !district || !salaryFrom || !salaryTo || specs.length === 0) {
        setError('Hamma maydonlarni to‘ldiring'); return;
      }
    } else {
      if (!company || !district || !salaryFrom || !salaryTo || specs.length === 0) {
        setError('Ism, tuman, mutaxassislik va kutilayotgan maoshni to‘ldiring'); return;
      }
    }
    if (!coords) {
      setError('Aniq manzilni xaritada belgilang'); return;
    }
    setSaving(true);
    try {
      const okAuth = await ensureAuth();
      if (!okAuth) { setSaving(false); return; }
      if (adKind === 'ishchi') {
        await api.saveWorker({
          name: company.trim(),
          city, district, specs,
          experience: description ? '1–3 yil' : '1 yildan kam',
          about: description,
          lat: coords?.lat, lng: coords?.lng,
          salaryFrom: Number(salaryFrom.replace(/\D/g, '')),
          salaryTo: Number(salaryTo.replace(/\D/g, '')),
          telegram: telegram.trim() || undefined,
        });
        nav('/workers');
        return;
      }
      const body = {
        title, company, city, district,
        workType: WORK_MAP[work] || 'Full-time',
        type: 'Factory',
        salaryFrom: Number(salaryFrom.replace(/\D/g, '')),
        salaryTo: Number(salaryTo.replace(/\D/g, '')),
        specs, description,
        lat: coords?.lat, lng: coords?.lng,
      };
      if (isEdit && editId) {
        await api.updateJob(editId, body);
        nav(`/jobs/${editId}`);
      } else {
        await api.postJob({ ...body, badge: 'New' });
        nav('/jobs');
      }
    } catch (e: any) {
      setError(e.message || 'Xatolik');
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Yuklanmoqda…</div>;

  return (
    <form onSubmit={submit} style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => nav(-1)} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}>×</button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? 'E‘lonni tahrirlash' : 'E’lon joylash'}</div>
        <div style={{ width: 38 }} />
      </div>

      {!isEdit && (
        <>
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>E’lon turi</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                { k: 'vakansiya', icon: '🏭', t: 'Ishchi kerak', s: 'Ish beruvchi sifatida' },
                { k: 'ishchi', icon: '👷', t: 'Ish qidiryapman', s: 'Ishchi sifatida' },
              ] as const).map(o => {
                const on = adKind === o.k;
                return (
                  <button key={o.k} type="button" onClick={() => setAdKind(o.k)} style={{
                    padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                    background: on ? 'var(--blue-50)' : '#fff',
                    border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
                  }}>
                    <div style={{ fontSize: 22 }}>{o.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, color: on ? 'var(--blue)' : 'var(--ink)' }}>{o.t}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{o.s}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        {!isAuthed && !isEdit && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Avval ro‘yxatdan o‘ting</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>Keyinchalik shu telefon va parol bilan kirasiz</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Telefon"><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 __ ___ __ __" /></Field>
              <Field label="Parol"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Kamida 4 belgi" /></Field>
            </div>
          </Card>
        )}

        <Field label={adKind === 'ishchi' ? 'Ismingiz' : 'Kompaniya yoki ustaxona nomi'}>
          <Input value={company} onChange={e => setCompany(e.target.value)} placeholder={adKind === 'ishchi' ? 'Masalan: Akmal' : 'Oyna Plast MChJ'} />
        </Field>
        {adKind === 'vakansiya' && (
          <Field label="Vakansiya nomi"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="PVX deraza yasovchi usta kerak" /></Field>
        )}
        <Field label={adKind === 'ishchi' ? 'Qanday ishlar qo‘lingizdan keladi?' : 'Qanday ishchilar kerak? (3 tasini ham tanlashingiz mumkin)'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {allSpecs.map(s => {
              const on = specs.includes(s);
              return (
                <button type="button" key={s} onClick={() => toggle(s)} style={{
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
          {specs.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              Tanlandi: <b style={{ color: 'var(--blue)' }}>{specs.join(', ')}</b>
            </div>
          )}
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label={adKind === 'ishchi' ? 'Kutilayotgan maosh (dan), so‘m' : 'Maosh (dan), so‘m'}>
            <Input value={salaryFrom} onChange={e => setSalaryFrom(e.target.value)} placeholder={adKind === 'ishchi' ? '2 000 000' : '5 000 000'} />
          </Field>
          <Field label="(gacha), so‘m">
            <Input value={salaryTo} onChange={e => setSalaryTo(e.target.value)} placeholder={adKind === 'ishchi' ? '6 000 000' : '8 000 000'} />
          </Field>
        </div>
        <Field label="Viloyat">
          <select value={city} onChange={e => pickCity(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Tuman">
          <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
            <option value="" disabled>Tumanni tanlang…</option>
            {(regions[city] || []).map(d => <option key={d} value={d}>📍 {d}</option>)}
          </select>
        </Field>
        <Field label="Aniq manzil (xaritadan belgilang)">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            {city && district
              ? 'Markerni kerakli joyga suring yoki xarita ustiga bosing — ishchilar sizni aniq topishadi'
              : 'Avval viloyat va tumanni tanlang'}
          </div>
          <MapPicker value={coords} onChange={setCoords} city={city} district={district} />
          {coords && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              ✓ Manzil belgilandi
            </div>
          )}
        </Field>
        {adKind === 'vakansiya' && (
          <Field label="Ish turi">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['To‘liq stavka', 'Yarim stavka', 'Loyiha'].map(w => <Chip key={w} on={work === w} onClick={() => setWork(w)}>{w}</Chip>)}
            </div>
          </Field>
        )}
        <Field label={adKind === 'ishchi' ? 'O‘zingiz haqingizda' : 'Talablar'}>
          <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={adKind === 'ishchi' ? 'Tajriba, o‘z asboblarim bor, shahar bo‘ylab tayyorman…' : '3+ yil tajriba, o‘z asboblari, shahar bo‘ylab harakatlanish imkoniyati.'} />
        </Field>
        {adKind === 'ishchi' && (
          <Field label="Telegram username (ixtiyoriy)">
            <Input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" />
          </Field>
        )}

        {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 12, fontSize: 13, fontWeight: 500, marginTop: 6 }}>⚠️ {error}</div>}

        <Btn type="submit" full style={{ marginTop: 12, opacity: saving ? .6 : 1 }}>
          {saving ? 'Saqlanmoqda…' : isEdit ? 'O‘zgarishlarni saqlash' : adKind === 'ishchi' ? 'Ishchi e’lonini joylash →' : 'Vakansiyani joylash →'}
        </Btn>
      </div>
    </form>
  );
};
