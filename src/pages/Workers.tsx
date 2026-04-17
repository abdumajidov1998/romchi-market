import React from 'react';
import { useNavigate } from 'react-router-dom';
import { allSpecs } from '../data';
import { Chip, WorkerCard, EmptyState, Btn, Badge, TelegramIcon } from '../ui';
import { useIsDesktop } from '../Layout';
import { api } from '../api';
import { SpecIcon } from '../SpecIcon';

const COLORS = ['blue', 'amber', 'green'] as const;
const decorate = (w: any) => ({
  ...w,
  initials: (w.name || '?').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
  color: COLORS[w.id % COLORS.length],
  active: 'today',
  distanceKm: 0,
});

const RADII = [5, 10, 15, 25, 50];

const fmt = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export const Workers: React.FC = () => {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [q, setQ] = React.useState('');
  const [spec, setSpec] = React.useState<string | null>(null);
  const [topOnly, setTopOnly] = React.useState(false);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [salaryMin, setSalaryMin] = React.useState('');
  const [salaryMax, setSalaryMax] = React.useState('');
  const [nearbyOn, setNearbyOn] = React.useState(false);
  const [radiusKm, setRadiusKm] = React.useState<number>(15);
  const [myCoords, setMyCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = React.useState(false);
  const [geoError, setGeoError] = React.useState('');

  const enableNearby = () => {
    if (nearbyOn) { setNearbyOn(false); return; }
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Brauzeringiz lokatsiyani qo‘llab-quvvatlamaydi'); return; }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyOn(true);
        setGeoBusy(false);
      },
      err => {
        setGeoError(err.code === 1 ? 'Lokatsiyaga ruxsat bermadingiz' : 'Lokatsiyani aniqlab bo‘lmadi');
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.workers({ q: q || undefined, spec: spec || undefined })
      .then(d => { if (ok) { setList(d.map(decorate)); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [q, spec]);

  const withDistance = React.useMemo(() => {
    if (!nearbyOn || !myCoords) return list;
    return list
      .map(w => {
        if (typeof w.lat === 'number' && typeof w.lng === 'number') {
          return { ...w, distanceKm: haversine(myCoords, { lat: w.lat, lng: w.lng }) };
        }
        return { ...w, distanceKm: Infinity };
      })
      .filter(w => w.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [list, nearbyOn, myCoords, radiusKm]);

  const minN = Number(salaryMin.replace(/\D/g, '')) || 0;
  const maxN = Number(salaryMax.replace(/\D/g, '')) || 0;
  let byAll = withDistance;
  if (minN) byAll = byAll.filter(w => (w.salaryTo || 0) >= minN);
  if (maxN) byAll = byAll.filter(w => (w.salaryFrom || 0) <= maxN);
  const filtered = topOnly ? byAll.filter(w => w.top) : byAll;

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}>←</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>🔧 Romchi Ish</div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Ishchilar</div>
        </div>
        {!desktop && <div style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>🔔</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
        <span style={{ color: 'var(--muted)' }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="PVX, Termo, Alyumin ishchi qidirish…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>
          {geoBusy ? '⏳ Aniqlanmoqda…' : '📍 Yaqin atrofdagilar'}
        </Chip>
        <Chip on={!spec && !topOnly} onClick={() => { setSpec(null); setTopOnly(false); }}>Hammasi</Chip>
        <Chip on={topOnly} onClick={() => setTopOnly(!topOnly)}>⭐ Eng yaxshi reytingda</Chip>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, margin: '4px 2px 8px' }}>Yo‘nalish bo‘yicha</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {allSpecs.map(s => {
          const on = spec === s;
          return (
            <button key={s} type="button" onClick={() => setSpec(on ? null : s)} style={{
              padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <SpecIcon name={s} size={36} />
              <div style={{ fontWeight: 700, fontSize: 13, color: on ? 'var(--blue)' : 'var(--ink)' }}>{s}</div>
            </button>
          );
        })}
      </div>
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
      {(spec || salaryMin || salaryMax) && (
        <button type="button" onClick={() => { setSpec(null); setSalaryMin(''); setSalaryMax(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
          ✕ Filterlarni tozalash
        </button>
      )}
      {nearbyOn && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Radius:</span>
          {RADII.map(r => (
            <Chip key={r} on={radiusKm === r} onClick={() => setRadiusKm(r)}>{r} km</Chip>
          ))}
        </div>
      )}
      {geoError && <div style={{ marginBottom: 8, padding: 10, background: '#FEE2E2', color: '#DC2626', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>⚠️ {geoError}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 2px 12px' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta ishchi topildi
          {nearbyOn && <> · {radiusKm} km radiusda</>}
        </div>
        <Badge>Avval eng yaxshilar</Badge>
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="🔎" title="Ishchilar topilmadi" sub="Filterlarni o‘zgartirib ko‘ring." ctaLabel="Tozalash" onCta={() => { setQ(''); setSpec(null); setTopOnly(false); }} /></>;

  if (desktop) {
    return (
      <div>
        {Header}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 16 }}>
          {filtered.sort((a, b) => Number(b.top) - Number(a.top)).map(w => (
            <div key={w.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  {w.specs && w.specs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      {w.specs.slice(0, 3).map((s: string) => (
                        <div key={s} style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--blue-50)', display: 'grid', placeItems: 'center' }}>
                          <SpecIcon name={s} size={44} />
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><b>{w.name}</b>{w.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {w.specs.map((s: string) => (
                        <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>{s}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>📍 {w.city} · {w.experience}</div>
                  </div>
                </div>
                {w.top && <Badge tone="amber">⭐ Eng yaxshi</Badge>}
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
                <div><b>{(w.rating || 0).toFixed(1)} <span style={{ color: 'var(--amber)' }}>★</span></b><div style={{ fontSize: 11, color: 'var(--muted)' }}>Reyting</div></div>
                <div><b>{w.jobs || 0}</b><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ishlar</div></div>
                <div><b>{w.verified ? '● Tasdiqlangan' : 'Yangi'}</b><div style={{ fontSize: 11, color: 'var(--muted)' }}>Holat</div></div>
              </div>
              <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <a href={w.phone ? `tel:${w.phone}` : undefined} style={{ textDecoration: 'none', opacity: w.phone ? 1 : .5, pointerEvents: w.phone ? 'auto' : 'none' }}>
                  <Btn variant="soft" style={{ padding: 9, fontSize: 13, width: '100%' }}>📞 Qo‘ng‘iroq</Btn>
                </a>
                <a href={w.telegram ? `https://t.me/${String(w.telegram).replace(/^@/, '')}` : w.phone ? `https://t.me/+${String(w.phone).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', opacity: (w.telegram || w.phone) ? 1 : .5, pointerEvents: (w.telegram || w.phone) ? 'auto' : 'none' }}>
                  <Btn variant="soft" style={{ padding: 9, fontSize: 13, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={20} /> Telegram</Btn>
                </a>
                <Btn style={{ padding: 9, fontSize: 13 }}>Taklif</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {Header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.sort((a, b) => Number(b.top) - Number(a.top)).map(w => <WorkerCard key={w.id} worker={w} />)}
      </div>
    </div>
  );
};
