'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Input, Field } from '@/components/ui';
import { cities, regions } from '@/lib/data';
import { api, auth } from '@/lib/api';
import { MapPicker } from '@/components/MapPickerLazy';
import { SpecIcon } from '@/components/SpecIcon';
import { WASTE_MATERIALS as MATERIALS } from '@/lib/constants';
import { SectionIcon } from '@/components/SectionIcon';

export default function CreateWasteBuyer() {
  const router = useRouter();
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
  const [priceAlikabond, setPriceAlikabond] = React.useState('');
  const [selectedMaterials, setSelectedMaterials] = React.useState<string[]>([]);
  const toggleMat = (k: string) => setSelectedMaterials(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);
  const PRICE_SETTERS: Record<string, React.Dispatch<React.SetStateAction<string>>> = {
    priceTermo: setPriceTermo,
    pricePvxOq: setPricePvxOq,
    pricePvxRangli: setPricePvxRangli,
    priceAlyumin: setPriceAlyumin,
    priceAlikabond: setPriceAlikabond,
  };
  const PRICE_VALUES: Record<string, string> = { priceTermo, pricePvxOq, pricePvxRangli, priceAlyumin, priceAlikabond };
  const PRICE_PLACEHOLDERS: Record<string, string> = { priceTermo: '4 000', pricePvxOq: '10 000', pricePvxRangli: '5 000', priceAlyumin: '10 000', priceAlikabond: '8 000' };
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isEdit, setIsEdit] = React.useState(false);

  React.useEffect(() => {
    if (!auth.token()) return;
    api.myProfiles().then(p => {
      const w = p?.wasteBuyer;
      if (!w) return;
      setIsEdit(true);
      setName(w.name || '');
      setCity(w.city || 'Toshkent');
      setDistrict(w.district || '');
      setAbout(w.about || '');
      const mats: string[] = [];
      if (w.priceTermo)      { setPriceTermo(String(w.priceTermo));         mats.push('priceTermo'); }
      if (w.pricePvxOq)      { setPricePvxOq(String(w.pricePvxOq));         mats.push('pricePvxOq'); }
      if (w.pricePvxRangli)  { setPricePvxRangli(String(w.pricePvxRangli)); mats.push('pricePvxRangli'); }
      if (w.priceAlyumin)    { setPriceAlyumin(String(w.priceAlyumin));     mats.push('priceAlyumin'); }
      if (w.priceAlikabond)  { setPriceAlikabond(String(w.priceAlikabond)); mats.push('priceAlikabond'); }
      setSelectedMaterials(mats);
      setTelegram(w.telegram || '');
      if (w.lat != null && w.lng != null) setCoords({ lat: Number(w.lat), lng: Number(w.lng) });
    }).catch(() => {});
  }, []);

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
    if (selectedMaterials.length === 0) {
      setError('Kamida bitta material turini tanlang'); return;
    }
    if (!priceTermo && !pricePvxOq && !pricePvxRangli && !priceAlyumin && !priceAlikabond) {
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
        priceAlikabond: priceAlikabond ? Number(priceAlikabond.replace(/\D/g, '')) : 0,
        lat: coords?.lat, lng: coords?.lng,
        telegram: telegram.trim() || undefined,
      });
      router.push('/atxod');
    } catch (e: any) {
      setError(e.message || 'Xatolik');
    } finally { setSaving(false); }
  };

  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => router.push('/atxod')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? 'Profilni tahrirlash' : 'Atxod oluvchi profili'}</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionIcon name="recycle" size={26} /> Atxod oluvchi bo'ling
      </div>
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

      <div style={{ fontWeight: 700, fontSize: 16, margin: '18px 0 10px' }}>Qaysi materiallarni qabul qilasiz?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {MATERIALS.map(m => {
          const on = selectedMaterials.includes(m.key);
          return (
            <button key={m.key} type="button" onClick={() => toggleMat(m.key)} style={{
              padding: '12px 4px', borderRadius: 14, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              position: 'relative',
            }}>
              <SpecIcon name={m.spec} size={32} />
              <div style={{ fontWeight: 700, fontSize: 11, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{m.label}</div>
              {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
            </button>
          );
        })}
      </div>

      {selectedMaterials.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 16, margin: '6px 0 10px' }}>Olinadigan narxlar (1 kg uchun, so'm)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {MATERIALS.filter(m => selectedMaterials.includes(m.key)).map(m => (
              <Field key={m.key} label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name={m.spec} size={20} /> {m.label}</span>}>
                <Input value={PRICE_VALUES[m.key]} onChange={e => PRICE_SETTERS[m.key](e.target.value)} placeholder={PRICE_PLACEHOLDERS[m.key]} inputMode="numeric" />
              </Field>
            ))}
          </div>
        </>
      )}

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
