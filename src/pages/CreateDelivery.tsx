import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Input, Field } from '../ui';
import { cities, regions } from '../data';
import { api, auth } from '../api';
import { MapPicker } from '../components/MapPicker';
import { PhoneVerify } from '../components/PhoneVerify';
import { DELIVERY_VEHICLES } from '../constants';
import { SectionIcon } from '../components/SectionIcon';

const VehicleThumb: React.FC<{ src: string; icon: string; size?: number }> = ({ src, icon, size = 56 }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [src]);
  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: '#EFF6FF', display: 'grid', placeItems: 'center', fontSize: Math.round(size * 0.55) }}>
        {icon}
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: '#EFF6FF', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

export const CreateDelivery: React.FC = () => {
  const nav = useNavigate();
  const [verified, setVerified] = React.useState(!!auth.token());
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('Toshkent');
  const [district, setDistrict] = React.useState('');
  const [about, setAbout] = React.useState('');
  const [vehicleModel, setVehicleModel] = React.useState<string>('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isEdit, setIsEdit] = React.useState(false);

  React.useEffect(() => {
    if (!auth.token()) return;
    api.myProfiles().then(p => {
      const d = p?.delivery;
      if (!d) return;
      setIsEdit(true);
      setName(d.name || '');
      setCity(d.city || 'Toshkent');
      setDistrict(d.district || '');
      setAbout(d.about || '');
      setVehicleModel(d.vehicleModel || '');
      setTelegram(d.telegram || '');
      if (d.lat != null && d.lng != null) setCoords({ lat: Number(d.lat), lng: Number(d.lng) });
    }).catch(() => {});
  }, []);

  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!auth.token()) { setError('Avval telefon raqamingizni tasdiqlang'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (!name.trim() || !district) { setError('Ism va tumanni to\'ldiring'); return; }
    if (!vehicleModel) { setError('Avtomobil turini tanlang'); return; }
    if (!coords) { setError('Xaritada joylashuvni belgilang'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('city', city);
      fd.append('district', district);
      fd.append('vehicleModel', vehicleModel);
      fd.append('isCustomVehicle', 'false');
      fd.append('about', about.trim());
      fd.append('lat', String(coords.lat));
      fd.append('lng', String(coords.lng));
      if (telegram.trim()) fd.append('telegram', telegram.trim());

      await api.saveDelivery(fd);
      nav('/delivery');
    } catch (e: any) { setError(e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => nav('/delivery')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Dostavkachi profili</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionIcon name="truck" size={26} color="var(--ink)" />
        {isEdit ? 'Profilni tahrirlash' : "Dostavkachi bo'ling"}
      </div>
      <p style={{ color: 'var(--muted)', margin: '6px 0 16px', fontSize: 14 }}>
        {isEdit ? "O'zgartirishlarni saqlang" : 'Avtomobilingizni tanlang — mijozlar sizni topadi'}
      </p>

      {!verified && (
        <div style={{ marginBottom: 16 }}>
          <PhoneVerify role="delivery" title="📱 Telefonni tasdiqlang" onDone={() => setVerified(true)} />
        </div>
      )}

      {!verified ? (
        <div style={{ padding: '20px 16px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, color: '#92400E', fontSize: 14, textAlign: 'center' }}>
          ⬆️ Profil ma'lumotlarini to'ldirish uchun avval telefon raqamingizni tasdiqlang
        </div>
      ) : (
      <>
      <Field label="Ismingiz">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Akmal Damas" />
      </Field>

      <div style={{ fontWeight: 700, fontSize: 16, margin: '18px 0 10px' }}>Avtomobil turini tanlang</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {DELIVERY_VEHICLES.map(v => {
          const on = vehicleModel === v.name;
          return (
            <button key={v.name} type="button" onClick={() => setVehicleModel(v.name)} style={{
              padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              position: 'relative',
            }}>
              <VehicleThumb src={v.image} icon={v.icon} size={56} />
              <div style={{ fontWeight: 700, fontSize: 11, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{v.name}</div>
              {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
            </button>
          );
        })}
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
          placeholder="Masalan: Toshkent bo'ylab. Tez va arzon. Kunduzi va kechasi xizmat ko'rsataman."
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
