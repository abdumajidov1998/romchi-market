import React from 'react';
import { Chip, JobCard, EmptyState } from '../ui';
import { usePersistedState } from '../persist';
import { useIsDesktop } from '../Layout';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { allSpecs } from '../data';
import { OYNACHI_SUBSPECS } from '../constants';
import { SpecIcon } from '../SpecIcon';
import { getSavedCoords, requestCoords } from '../userLocation';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { SectionIcon } from '../components/SectionIcon';

const RADII = [5, 10, 15, 25, 50];

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const fmt = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const Jobs: React.FC = () => {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [tab, setTab] = usePersistedState<'Siz uchun' | 'Yaqinda' | 'Yuqori maosh' | 'Yangi'>('filters:jobs:tab', 'Siz uchun');
  const [pickedSpecs, setPickedSpecs] = usePersistedState<string[]>('filters:jobs:specs', []);
  const [pickedOynachiSubs, setPickedOynachiSubs] = usePersistedState<string[]>('filters:jobs:oynachiSubs', []);
  const [salaryMin, setSalaryMin] = usePersistedState('filters:jobs:salaryMin', '');
  const [salaryMax, setSalaryMax] = usePersistedState('filters:jobs:salaryMax', '');
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [nearbyOn, setNearbyOn] = usePersistedState('filters:jobs:nearbyOn', false);
  const [radiusKm, setRadiusKm] = usePersistedState<number>('filters:jobs:radiusKm', 15);
  const [myCoords, setMyCoords] = React.useState<{ lat: number; lng: number } | null>(getSavedCoords());
  const [geoBusy, setGeoBusy] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const enableNearby = async () => {
    if (nearbyOn) { setNearbyOn(false); return; }
    if (myCoords) { setNearbyOn(true); return; }
    setGeoBusy(true);
    try {
      const c = await requestCoords();
      setMyCoords(c);
      setNearbyOn(true);
    } catch {
      setPickerOpen(true);
    } finally {
      setGeoBusy(false);
    }
  };

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.jobs()
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

  const minN = Number(salaryMin.replace(/\D/g, '')) || 0;
  const maxN = Number(salaryMax.replace(/\D/g, '')) || 0;
  let filtered = list;
  if (pickedSpecs.length || pickedOynachiSubs.length) {
    const eff = new Set<string>(pickedSpecs);
    if (pickedSpecs.includes('Oynachi')) {
      const subs = pickedOynachiSubs.length > 0 ? pickedOynachiSubs : (OYNACHI_SUBSPECS as readonly string[]);
      subs.forEach(x => eff.add(x));
    }
    pickedOynachiSubs.forEach(x => eff.add(x));
    filtered = filtered.filter(j => (j.specs || []).some((s: string) => eff.has(s)));
  }
  if (minN) filtered = filtered.filter(j => (j.salaryTo || 0) >= minN);
  if (maxN) filtered = filtered.filter(j => (j.salaryFrom || 0) <= maxN);
  if (nearbyOn && myCoords) {
    filtered = filtered
      .map(j => ({
        ...j,
        distanceKm: (typeof j.lat === 'number' && typeof j.lng === 'number')
          ? haversine(myCoords, { lat: j.lat, lng: j.lng }) : Infinity,
      }))
      .filter(j => j.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
  if (tab === 'Yuqori maosh') filtered = [...filtered].sort((a, b) => b.salaryTo - a.salaryTo);
  if (tab === 'Yangi') filtered = filtered.filter(j => j.badge === 'New');
  const toggleSpec = (s: string) => setPickedSpecs(p => {
    const next = p.includes(s) ? p.filter(x => x !== s) : [...p, s];
    if (s === 'Oynachi' && p.includes(s)) setPickedOynachiSubs([]);
    return next;
  });
  const toggleOynachiSub = (s: string) => setPickedOynachiSubs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <SectionIcon name="briefcase" size={14} /> Romchi Ish
          </div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Keyingi ishingizni toping</div>
        </div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>
          {geoBusy ? '⏳ Aniqlanmoqda…' : '📍 Yaqin atrofdagilar'}
        </Chip>
        {(['Siz uchun', 'Yaqinda', 'Yuqori maosh', 'Yangi'] as const).map(t =>
          <Chip key={t} on={tab === t} onClick={() => setTab(t)}>{t}</Chip>
        )}
      </div>
      {nearbyOn && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Radius:</span>
          {RADII.map(r => (
            <Chip key={r} on={radiusKm === r} onClick={() => setRadiusKm(r)}>{r} km</Chip>
          ))}
        </div>
      )}
      <LocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={c => { setMyCoords(c); setNearbyOn(true); }}
      />
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, margin: '4px 2px 8px' }}>Yo‘nalish bo‘yicha</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {allSpecs.map(s => {
          const on = pickedSpecs.includes(s);
          return (
            <button key={s} type="button" onClick={() => toggleSpec(s)} style={{
              padding: '12px 4px', borderRadius: 14, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              position: 'relative',
            }}>
              <SpecIcon name={s} size={32} />
              <div style={{ fontWeight: 700, fontSize: 12, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{s}</div>
              {on && <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>✓</div>}
            </button>
          );
        })}
      </div>
      {pickedSpecs.includes('Oynachi') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, padding: '10px 12px', background: 'var(--blue-50)', borderRadius: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700, marginRight: 4, alignSelf: 'center' }}>🪟 Oynachi yo'nalishlari:</span>
          {OYNACHI_SUBSPECS.map(s => (
            <Chip key={s} on={pickedOynachiSubs.includes(s)} onClick={() => toggleOynachiSub(s)}>{s}</Chip>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, margin: '4px 2px 8px' }}>Maosh oralig‘i (so‘m)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 0, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 13 }}>💵</span>
          <input value={salaryMin} onChange={e => setSalaryMin(fmt(e.target.value))} placeholder="Dan" inputMode="numeric" style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', fontSize: 13, background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 0, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 13 }}>💰</span>
          <input value={salaryMax} onChange={e => setSalaryMax(fmt(e.target.value))} placeholder="Gacha" inputMode="numeric" style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', fontSize: 13, background: 'transparent' }} />
        </div>
      </div>
      {(pickedSpecs.length > 0 || pickedOynachiSubs.length > 0 || salaryMin || salaryMax) && (
        <button type="button" onClick={() => { setPickedSpecs([]); setPickedOynachiSubs([]); setSalaryMin(''); setSalaryMax(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
          ✕ Filterlarni tozalash
        </button>
      )}
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="💼" title="Hozircha ishlar yo‘q" sub="Yangi e’lonlar paydo bo‘lganda sizga xabar beramiz." /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(j => <JobCard key={j.id} job={j} />)}
      </div>
    </div>
  );
};
