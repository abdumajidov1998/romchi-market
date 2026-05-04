'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Input, Field } from '@/components/ui';
import { cities, regions } from '@/lib/data';
import { api, auth } from '@/lib/api';
import { MapPicker } from '@/components/MapPickerLazy';
import { PhoneVerify } from '@/components/PhoneVerify';
import { STANOK_SPECS as SPECS } from '@/lib/constants';
import { StanokSpecIcon } from '@/components/StanokSpecIcon';
import { SectionIcon } from '@/components/SectionIcon';

const EXP = ['1 yildan kam', '1-3 yil', '3-5 yil', '5+ yil'];

export default function CreateStanok() {
  const router = useRouter();
  const [verified, setVerified] = React.useState(!!auth.token());
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('Toshkent');
  const [district, setDistrict] = React.useState('');
  const [about, setAbout] = React.useState('');
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [priceDiag, setPriceDiag] = React.useState('');
  const [priceCharx, setPriceCharx] = React.useState('');
  const [urgent, setUrgent] = React.useState(false);
  const [experience, setExperience] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isEdit, setIsEdit] = React.useState(false);

  React.useEffect(() => {
    if (!auth.token()) return;
    api.myProfiles().then(p => {
      const s = p?.stanok;
      if (!s) return;
      setIsEdit(true);
      setName(s.name || '');
      setCity(s.city || 'Toshkent');
      setDistrict(s.district || '');
      setAbout(s.about || '');
      setSpecs(Array.isArray(s.specs) ? s.specs : []);
      setPriceDiag(s.priceDiagnostika ? String(s.priceDiagnostika) : '');
      setPriceCharx(s.priceCharxlash ? String(s.priceCharxlash) : '');
      setUrgent(!!s.urgent);
      setExperience(s.experience || '');
      setTelegram(s.telegram || '');
      if (s.lat != null && s.lng != null) setCoords({ lat: Number(s.lat), lng: Number(s.lng) });
    }).catch(() => {});
  }, []);

  const toggle = (s: string) => setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!auth.token()) { setError('Avval telefon raqamingizni tasdiqlang'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (!name.trim() || !district || specs.length === 0) { setError('Ism, tuman va kamida 1 ta yo\'nalish tanlang'); return; }
    if (!coords) { setError('Xaritada joylashuvni belgilang'); return; }
    setSaving(true);
    try {
      await api.saveStanok({
        name: name.trim(), city, district, about: about.trim(), specs,
        priceDiagnostika: priceDiag ? Number(priceDiag.replace(/\D/g, '')) : 0,
        priceCharxlash: priceCharx ? Number(priceCharx.replace(/\D/g, '')) : 0,
        urgent, experience,
        lat: coords?.lat, lng: coords?.lng,
        telegram: telegram.trim() || undefined,
      });
      router.push('/stanok');
    } catch (e: any) { setError(e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => router.push('/stanok')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? 'Profilni tahrirlash' : 'Stanok ustasi profili'}</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionIcon name="gear" size={26} /> Stanok ustasi bo'ling
      </div>
      <p style={{ color: 'var(--muted)', margin: '6px 0 16px', fontSize: 14 }}>Yo'nalish va narxni belgilang — mijozlar sizni topadi</p>

      {!verified && (
        <div style={{ marginBottom: 16 }}>
          <PhoneVerify role="stanok" title="📱 Telefonni tasdiqlang" onDone={() => setVerified(true)} />
        </div>
      )}

      {!verified ? (
        <div style={{ padding: '20px 16px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, color: '#92400E', fontSize: 14, textAlign: 'center' }}>
          ⬆️ Profil ma'lumotlarini to'ldirish uchun avval telefon raqamingizni tasdiqlang
        </div>
      ) : (
      <>
      <Field label="Ismingiz yoki kompaniya nomi">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Anvar Stanok Servis" />
      </Field>

      <div style={{ fontWeight: 700, fontSize: 16, margin: '18px 0 10px' }}>Qanday stanoklar bilan ishlaysiz?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {SPECS.map(s => {
          const on = specs.includes(s);
          return (
            <button key={s} type="button" onClick={() => toggle(s)} style={{
              padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              position: 'relative',
            }}>
              <StanokSpecIcon name={s} size={32} color={on ? 'var(--blue)' : 'var(--ink)'} />
              <div style={{ fontWeight: 700, fontSize: 10, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{s}</div>
              {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
            </button>
          );
        })}
      </div>

      {specs.some(s => s !== 'Arra chaxlovchi') && (
        <Field label="⚡ Diagnostika / Chaqiruv narxi (so'm)">
          <Input value={priceDiag} onChange={e => setPriceDiag(e.target.value)} placeholder="200 000 (bo'sh qoldiring = Kelishiladi)" inputMode="numeric" />
        </Field>
      )}
      {specs.includes('Arra chaxlovchi') && (
        <Field label="🪚 Arra charxlash narxi (so'm)">
          <Input value={priceCharx} onChange={e => setPriceCharx(e.target.value)} placeholder="50 000 (bo'sh qoldiring = Kelishiladi)" inputMode="numeric" />
        </Field>
      )}

      <div style={{ fontWeight: 700, fontSize: 16, margin: '18px 0 10px' }}>Tajribangiz</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {EXP.map(e => (
          <button key={e} type="button" onClick={() => setExperience(e)} style={{
            padding: '12px 6px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: experience === e ? 'var(--blue)' : '#fff', color: experience === e ? '#fff' : 'var(--ink)',
            border: `1px solid ${experience === e ? 'var(--blue)' : 'var(--line)'}`,
          }}>{e}</button>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', background: urgent ? '#FFF7ED' : '#fff',
        border: `1.5px solid ${urgent ? '#F59E0B' : 'var(--line)'}`, borderRadius: 14, marginBottom: 14, cursor: 'pointer',
      }} onClick={() => setUrgent(!urgent)}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>⚡ Shoshilinch chiqaman (24/7)</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Kechasi va dam olish kunlari ham chiqasizmi?</div>
        </div>
        <div style={{
          width: 44, height: 24, borderRadius: 12, background: urgent ? '#F59E0B' : 'var(--line)',
          position: 'relative', transition: 'background .2s',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2,
            left: urgent ? 22 : 2, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          }} />
        </div>
      </div>

      <Field label="Viloyat">
        <select value={city} onChange={e => pickCity(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Tuman">
        <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
          <option value="" disabled>Tumanni tanlang...</option>
          {(regions[city] || []).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>

      <Field label="Aniq manzil (xaritadan belgilang)">
        <MapPicker value={coords} onChange={setCoords} city={city} />
      </Field>

      <Field label="Telegram username (ixtiyoriy)">
        <Input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" />
      </Field>

      <Field label="O'zingiz haqingizda (ixtiyoriy)">
        <textarea value={about} onChange={e => setAbout(e.target.value)} maxLength={400} rows={3}
          placeholder="Masalan: 10 yillik tajriba. Barcha turdagi stanoklar. Tez va sifatli xizmat."
          style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '14px 16px', fontSize: 15, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 12, fontSize: 13, fontWeight: 500, marginTop: 6 }}>⚠️ {error}</div>}

      <Btn type="submit" full style={{ marginTop: 16, opacity: saving ? .6 : 1 }}>
        {saving ? 'Saqlanmoqda...' : 'Profilni saqlash →'}
      </Btn>
      </>
      )}
    </form>
  );
};
