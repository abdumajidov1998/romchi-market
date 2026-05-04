'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Input, Field } from '@/components/ui';
import { cities, regions } from '@/lib/data';
import { api, auth } from '@/lib/api';
import { MapPicker } from '@/components/MapPickerLazy';
import { PhoneVerify } from '@/components/PhoneVerify';
import { SpecIcon } from '@/components/SpecIcon';
import { USLUGA_SPECS as SPECS } from '@/lib/constants';
import { SectionIcon } from '@/components/SectionIcon';


export default function CreateUsluga() {
  const router = useRouter();
  const [verified, setVerified] = React.useState(!!auth.token());
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('Toshkent');
  const [district, setDistrict] = React.useState('');
  const [about, setAbout] = React.useState('');
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [priceTermo, setPriceTermo] = React.useState('');
  const [pricePvx, setPricePvx] = React.useState('');
  const [priceAlyumin, setPriceAlyumin] = React.useState('');
  const [priceSurma, setPriceSurma] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isEdit, setIsEdit] = React.useState(false);

  React.useEffect(() => {
    if (!auth.token()) return;
    api.myProfiles().then(p => {
      const u = p?.usluga;
      if (!u) return;
      setIsEdit(true);
      setName(u.name || '');
      setCity(u.city || 'Toshkent');
      setDistrict(u.district || '');
      setAbout(u.about || '');
      setSpecs(Array.isArray(u.specs) ? u.specs : []);
      setPriceTermo(u.priceTermo ? String(u.priceTermo) : '');
      setPricePvx(u.pricePvx ? String(u.pricePvx) : '');
      setPriceAlyumin(u.priceAlyumin ? String(u.priceAlyumin) : '');
      setPriceSurma(u.priceSurma ? String(u.priceSurma) : '');
      setTelegram(u.telegram || '');
      if (u.lat != null && u.lng != null) setCoords({ lat: Number(u.lat), lng: Number(u.lng) });
    }).catch(() => {});
  }, []);

  const toggle = (s: string) => setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !district || specs.length === 0) {
      setError('Ism, tuman va kamida 1 ta yo\'nalish tanlang'); return;
    }
    if (!coords) { setError('Xaritada joylashuvni belgilang'); return; }
    setSaving(true);
    try {
      await api.saveUsluga({
        name: name.trim(), city, district, about: about.trim(), specs,
        priceTermo: priceTermo ? Number(priceTermo.replace(/\D/g, '')) : 0,
        pricePvx: pricePvx ? Number(pricePvx.replace(/\D/g, '')) : 0,
        priceAlyumin: priceAlyumin ? Number(priceAlyumin.replace(/\D/g, '')) : 0,
        priceSurma: priceSurma ? Number(priceSurma.replace(/\D/g, '')) : 0,
        lat: coords?.lat, lng: coords?.lng,
        telegram: telegram.trim() || undefined,
      });
      router.push('/usluga');
    } catch (e: any) { setError(e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => router.push('/usluga')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? 'Profilni tahrirlash' : 'Sex/Ustaxona profili'}</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionIcon name="wrench" size={26} /> Uslugachi bo'ling
      </div>
      <p style={{ color: 'var(--muted)', margin: '6px 0 16px', fontSize: 14 }}>Narxlaringizni belgilang — boshqa sexlar sizni topadi</p>

      {!verified && (
        <div style={{ marginBottom: 16 }}>
          <PhoneVerify role="usluga" title="📱 Telefonni tasdiqlang" onDone={() => setVerified(true)} />
        </div>
      )}

      <Field label="Sex yoki ustaxona nomi">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Grand Oyna Sex" />
      </Field>

      <div style={{ fontWeight: 700, fontSize: 16, margin: '18px 0 10px' }}>Qanday yo'nalishda ishlaysiz?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {SPECS.map(s => {
          const on = specs.includes(s);
          return (
            <button key={s} type="button" onClick={() => toggle(s)} style={{
              padding: '14px 8px', borderRadius: 16, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              position: 'relative',
            }}>
              <SpecIcon name={s} size={44} />
              <div style={{ fontWeight: 700, fontSize: 14, color: on ? 'var(--blue)' : 'var(--ink)' }}>{s}</div>
              {on && <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>✓</div>}
            </button>
          );
        })}
      </div>

      <div style={{ fontWeight: 700, fontSize: 16, margin: '10px 0 10px' }}>Narxlar (1 m² uchun, so'm)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {specs.includes('Termo') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name="Termo" size={20} /> Termo (so'm/m²)</span>}>
            <Input value={priceTermo} onChange={e => setPriceTermo(e.target.value)} placeholder="85 000" inputMode="numeric" />
          </Field>
        )}
        {specs.includes('PVX') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name="PVX" size={20} /> PVX (so'm/m²)</span>}>
            <Input value={pricePvx} onChange={e => setPricePvx(e.target.value)} placeholder="120 000" inputMode="numeric" />
          </Field>
        )}
        {specs.includes('Alyumin') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name="Alyumin" size={20} /> Alyumin (so'm/m²)</span>}>
            <Input value={priceAlyumin} onChange={e => setPriceAlyumin(e.target.value)} placeholder="180 000" inputMode="numeric" />
          </Field>
        )}
        {specs.includes('Surma') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name="Surma" size={20} /> Surma eshik (so'm/m²)</span>}>
            <Input value={priceSurma} onChange={e => setPriceSurma(e.target.value)} placeholder="150 000" inputMode="numeric" />
          </Field>
        )}
        {specs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Avval yo'nalish tanlang</div>}
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
          placeholder="Masalan: Optom narxlarda ishlaymiz. Boshqa sexlar uchun buyurtma qabul qilamiz."
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
