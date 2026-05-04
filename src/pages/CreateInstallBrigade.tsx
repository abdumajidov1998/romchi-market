import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Input, Field } from '../ui';
import { cities, regions } from '../data';
import { api, auth } from '../api';
import { MapPicker } from '../components/MapPicker';
import { PhoneVerify } from '../components/PhoneVerify';
import { SpecIcon } from '../SpecIcon';
import { INSTALL_BRIGADA_SPECS as SPECS } from '../constants';
import { SectionIcon } from '../components/SectionIcon';

const SpecVisual: React.FC<{ name: string; size?: number }> = ({ name, size = 32 }) => <SpecIcon name={name} size={size} />;

export const CreateInstallBrigade: React.FC = () => {
  const nav = useNavigate();
  const [verified, setVerified] = React.useState(!!auth.token());
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('Toshkent');
  const [district, setDistrict] = React.useState('');
  const [about, setAbout] = React.useState('');
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [teamSize, setTeamSize] = React.useState('');
  const [experience, setExperience] = React.useState('');
  const [priceTermo, setPriceTermo] = React.useState('');
  const [pricePvx, setPricePvx] = React.useState('');
  const [priceAlyumin, setPriceAlyumin] = React.useState('');
  const [priceJpFasad, setPriceJpFasad] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isEdit, setIsEdit] = React.useState(false);

  React.useEffect(() => {
    if (!auth.token()) return;
    api.myProfiles().then(p => {
      const b = p?.installBrigada;
      if (!b) return;
      setIsEdit(true);
      setName(b.name || '');
      setCity(b.city || 'Toshkent');
      setDistrict(b.district || '');
      setAbout(b.about || '');
      setSpecs(Array.isArray(b.specs) ? b.specs : []);
      setTeamSize(b.teamSize ? String(b.teamSize) : '');
      setExperience(b.experience || '');
      setPriceTermo(b.priceTermo ? String(b.priceTermo) : '');
      setPricePvx(b.pricePvx ? String(b.pricePvx) : '');
      setPriceAlyumin(b.priceAlyumin ? String(b.priceAlyumin) : '');
      setPriceJpFasad(b.priceJpFasad ? String(b.priceJpFasad) : '');
      setTelegram(b.telegram || '');
      if (b.lat != null && b.lng != null) setCoords({ lat: Number(b.lat), lng: Number(b.lng) });
    }).catch(() => {});
  }, []);

  const toggle = (s: string) => setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !district || specs.length === 0) {
      setError('Brigada nomi, tuman va kamida 1 ta yo\'nalish tanlang'); return;
    }
    if (!coords) { setError('Xaritada joylashuvni belgilang'); return; }
    setSaving(true);
    try {
      await api.saveInstallBrigade({
        name: name.trim(), city, district, about: about.trim(), specs,
        teamSize: teamSize ? Number(teamSize.replace(/\D/g, '')) : 1,
        experience: experience.trim(),
        priceTermo: priceTermo ? Number(priceTermo.replace(/\D/g, '')) : 0,
        pricePvx: pricePvx ? Number(pricePvx.replace(/\D/g, '')) : 0,
        priceAlyumin: priceAlyumin ? Number(priceAlyumin.replace(/\D/g, '')) : 0,
        priceJpFasad: priceJpFasad ? Number(priceJpFasad.replace(/\D/g, '')) : 0,
        lat: coords?.lat, lng: coords?.lng,
        telegram: telegram.trim() || undefined,
      });
      nav('/ustanofka');
    } catch (e: any) { setError(e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => nav('/ustanofka')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Brigada profili</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionIcon name="hardhat" size={26} /> {isEdit ? 'Brigadani tahrirlash' : 'Ustanofka brigada'}
      </div>
      <p style={{ color: 'var(--muted)', margin: '6px 0 16px', fontSize: 14 }}>
        {isEdit ? "O'zgartirishlarni saqlang" : "Tayyor rom va eshik-derazalarni o'rnatuvchi brigadalar uchun"}
      </p>

      {!verified && (
        <div style={{ marginBottom: 16 }}>
          <PhoneVerify role="install" title="📱 Telefonni tasdiqlang" onDone={() => setVerified(true)} />
        </div>
      )}

      <Field label="Brigada nomi yoki boshlig'i ismi">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Ustanofka Brigada Aziz" />
      </Field>

      <div style={{ fontWeight: 700, fontSize: 16, margin: '18px 0 10px' }}>Qaysi profillarni o'rnatasiz?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {SPECS.map(s => {
          const on = specs.includes(s);
          return (
            <button key={s} type="button" onClick={() => toggle(s)} style={{
              padding: '12px 4px', borderRadius: 16, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              position: 'relative',
            }}>
              <SpecVisual name={s} size={36} />
              <div style={{ fontWeight: 700, fontSize: 12, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{s}</div>
              {on && <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>✓</div>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Brigada a'zolari soni">
          <Input value={teamSize} onChange={e => setTeamSize(e.target.value.replace(/\D/g, ''))} placeholder="3" inputMode="numeric" />
        </Field>
        <Field label="Tajriba">
          <select value={experience} onChange={e => setExperience(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
            <option value="">Tanlang…</option>
            <option value="1 yildan kam">1 yildan kam</option>
            <option value="1-3 yil">1-3 yil</option>
            <option value="3-5 yil">3-5 yil</option>
            <option value="5+ yil">5+ yil</option>
          </select>
        </Field>
      </div>

      <div style={{ fontWeight: 700, fontSize: 16, margin: '10px 0 10px' }}>Ustanofka narxlari (1 m² uchun, so'm)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {specs.includes('Termo') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name="Termo" size={20} /> Termo (so'm/m²)</span>}>
            <Input value={priceTermo} onChange={e => setPriceTermo(e.target.value)} placeholder="35 000" inputMode="numeric" />
          </Field>
        )}
        {specs.includes('PVX') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name="PVX" size={20} /> PVX (so'm/m²)</span>}>
            <Input value={pricePvx} onChange={e => setPricePvx(e.target.value)} placeholder="40 000" inputMode="numeric" />
          </Field>
        )}
        {specs.includes('Alyumin') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecIcon name="Alyumin" size={20} /> Alyumin (so'm/m²)</span>}>
            <Input value={priceAlyumin} onChange={e => setPriceAlyumin(e.target.value)} placeholder="55 000" inputMode="numeric" />
          </Field>
        )}
        {specs.includes('JP fasad') && (
          <Field label={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SpecVisual name="JP fasad" size={20} /> JP fasad (so'm/m²)</span>}>
            <Input value={priceJpFasad} onChange={e => setPriceJpFasad(e.target.value)} placeholder="65 000" inputMode="numeric" />
          </Field>
        )}
        {specs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Avval profil turini tanlang</div>}
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
          placeholder="Masalan: Tez va sifatli o'rnatamiz, kafolat beramiz."
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
