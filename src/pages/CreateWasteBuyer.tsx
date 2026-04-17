import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Input, Field } from '../ui';
import { cities, regions } from '../data';
import { api, auth } from '../api';
import { MapPicker } from '../components/MapPicker';

export const CreateWasteBuyer: React.FC = () => {
  const nav = useNavigate();
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('+998 ');
  const [password, setPassword] = React.useState('');
  const [city, setCity] = React.useState('Toshkent');
  const [district, setDistrict] = React.useState('');
  const [about, setAbout] = React.useState('');
  const [priceTermo, setPriceTermo] = React.useState('');
  const [pricePvxOq, setPricePvxOq] = React.useState('');
  const [pricePvxRangli, setPricePvxRangli] = React.useState('');
  const [priceAlyumin, setPriceAlyumin] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const isAuthed = !!auth.token();

  const ensureAuth = async (): Promise<boolean> => {
    if (isAuthed) return true;
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.replace(/\D/g, '').length < 9 || password.length < 4) {
      setError('Telefon raqam va parolni to\'ldiring (parol kamida 4 belgi)');
      return false;
    }
    try {
      const r = await api.register({ phone: cleanPhone, password, role: 'waste_buyer' as any });
      auth.set(r.token, r.user); return true;
    } catch (e: any) {
      if (String(e.message).toLowerCase().includes('already')) {
        try {
          const r = await api.login(cleanPhone, password);
          auth.set(r.token, r.user); return true;
        } catch { setError('Parol noto\'g\'ri'); return false; }
      }
      setError(e.message); return false;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !district) {
      setError('Ism va tumanni to\'ldiring'); return;
    }
    if (!priceTermo && !pricePvxOq && !pricePvxRangli && !priceAlyumin) {
      setError('Kamida bitta material narxini kiriting'); return;
    }
    if (!coords) {
      setError('Xaritada joylashuvni belgilang'); return;
    }
    setSaving(true);
    try {
      const ok = await ensureAuth();
      if (!ok) { setSaving(false); return; }
      await api.saveWasteBuyer({
        name: name.trim(), city, district, about: about.trim(),
        priceTermo: priceTermo ? Number(priceTermo.replace(/\D/g, '')) : 0,
        pricePvxOq: pricePvxOq ? Number(pricePvxOq.replace(/\D/g, '')) : 0,
        pricePvxRangli: pricePvxRangli ? Number(pricePvxRangli.replace(/\D/g, '')) : 0,
        priceAlyumin: priceAlyumin ? Number(priceAlyumin.replace(/\D/g, '')) : 0,
        lat: coords?.lat, lng: coords?.lng,
        telegram: telegram.trim() || undefined,
      });
      nav('/atxod');
    } catch (e: any) {
      setError(e.message || 'Xatolik');
    } finally { setSaving(false); }
  };

  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => nav('/atxod')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}>←</button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Atxod oluvchi profili</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>♻️ Atxod oluvchi bo'ling</div>
      <p style={{ color: 'var(--muted)', margin: '6px 0 16px', fontSize: 14 }}>Narxlaringizni belgilang — sotuvchilar sizni topishadi</p>

      {!isAuthed && (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Avval ro'yxatdan o'ting</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Telefon"><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 __ ___ __ __" /></Field>
            <Field label="Parol"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Kamida 4 belgi" /></Field>
          </div>
        </div>
      )}

      <Field label="Ismingiz yoki kompaniya nomi">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Alisher Atxodchi" />
      </Field>

      <div style={{ fontWeight: 700, fontSize: 16, margin: '18px 0 10px' }}>Olinadigan narxlar (1 kg uchun, so'm)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><img src="/images/pvx.png" alt="" style={{ width: 20, height: 20 }} /> Termo</span>}>
          <Input value={priceTermo} onChange={e => setPriceTermo(e.target.value)} placeholder="4 000" inputMode="numeric" />
        </Field>
        <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><img src="/images/termo.png" alt="" style={{ width: 20, height: 20 }} /> PVX Oq</span>}>
          <Input value={pricePvxOq} onChange={e => setPricePvxOq(e.target.value)} placeholder="10 000" inputMode="numeric" />
        </Field>
        <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><img src="/images/termo.png" alt="" style={{ width: 20, height: 20 }} /> PVX Rangli</span>}>
          <Input value={pricePvxRangli} onChange={e => setPricePvxRangli(e.target.value)} placeholder="5 000" inputMode="numeric" />
        </Field>
        <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><img src="/images/alyumin.png" alt="" style={{ width: 20, height: 20 }} /> Alyumin</span>}>
          <Input value={priceAlyumin} onChange={e => setPriceAlyumin(e.target.value)} placeholder="10 000" inputMode="numeric" />
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
          {(regions[city] || []).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>

      <Field label="Aniq manzil (xaritadan belgilang)">
        <MapPicker value={coords} onChange={setCoords} city={city} />
      </Field>

      <Field label="Telegram username (ixtiyoriy)">
        <Input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" />
      </Field>

      <Field label="Qo'shimcha ma'lumot (ixtiyoriy)">
        <textarea value={about} onChange={e => setAbout(e.target.value)} maxLength={400} rows={3}
          placeholder="Masalan: Barcha turdagi atxodlarni olamiz. Tez va qulay xizmat."
          style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '14px 16px', fontSize: 15, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 12, fontSize: 13, fontWeight: 500, marginTop: 6 }}>⚠️ {error}</div>}

      <Btn type="submit" full style={{ marginTop: 16, opacity: saving ? .6 : 1 }}>
        {saving ? 'Saqlanmoqda…' : 'Profilni saqlash →'}
      </Btn>
    </form>
  );
};
