'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { allSpecs } from '@/lib/data';
import { OYNACHI_SUBSPECS } from '@/lib/constants';
import { Chip, WorkerCard, EmptyState, Btn, TelegramIcon, tgHref } from '@/components/ui';
import { usePersistedState } from '@/lib/persist';
import { useIsDesktop } from '@/components/Layout';
import { api } from '@/lib/api';
import { SpecIcon } from '@/components/SpecIcon';
import { getSavedCoords, requestCoords } from '@/lib/userLocation';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { SectionIcon } from '@/components/SectionIcon';

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

export default function Workers() {
  const desktop = useIsDesktop();
  const router = useRouter();
  const [selectedSpecs, setSelectedSpecs] = usePersistedState<string[]>('filters:workers:specs', []);
  const [selectedOynachiSubs, setSelectedOynachiSubs] = usePersistedState<string[]>('filters:workers:oynachiSubs', []);
  const toggleSpec = (s: string) => setSelectedSpecs(p => {
    const next = p.includes(s) ? p.filter(x => x !== s) : [...p, s];
    if (s === 'Oynachi' && p.includes(s)) setSelectedOynachiSubs([]);
    return next;
  });
  const toggleOynachiSub = (s: string) => setSelectedOynachiSubs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [salaryMin, setSalaryMin] = usePersistedState('filters:workers:salaryMin', '');
  const [salaryMax, setSalaryMax] = usePersistedState('filters:workers:salaryMax', '');
  const [nearbyOn, setNearbyOn] = usePersistedState('filters:workers:nearbyOn', false);
  const [radiusKm, setRadiusKm] = usePersistedState<number>('filters:workers:radiusKm', 15);
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
    api.workers()
      .then(d => { if (ok) { setList(d.map(decorate)); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

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
  if (selectedSpecs.length > 0 || selectedOynachiSubs.length > 0) {
    const eff = new Set<string>(selectedSpecs);
    if (selectedSpecs.includes('Oynachi')) {
      const subs = selectedOynachiSubs.length > 0 ? selectedOynachiSubs : (OYNACHI_SUBSPECS as readonly string[]);
      subs.forEach(x => eff.add(x));
    }
    selectedOynachiSubs.forEach(x => eff.add(x));
    byAll = byAll.filter(w => (w.specs || []).some((s: string) => eff.has(s)));
  }
  if (minN) byAll = byAll.filter(w => (w.salaryTo || 0) >= minN);
  if (maxN) byAll = byAll.filter(w => (w.salaryFrom || 0) <= maxN);
  const filtered = byAll;

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.push('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <SectionIcon name="briefcase" size={14} /> Romchi Ish
          </div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Ishchilar</div>
        </div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>
          {geoBusy ? '⏳ Aniqlanmoqda…' : '📍 Yaqin atrofdagilar'}
        </Chip>
        <Chip on={selectedSpecs.length === 0} onClick={() => setSelectedSpecs([])}>Hammasi</Chip>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, margin: '4px 2px 8px' }}>Yo‘nalish bo‘yicha</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {allSpecs.map(s => {
          const on = selectedSpecs.includes(s);
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
      {selectedSpecs.includes('Oynachi') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, padding: '10px 12px', background: 'var(--blue-50)', borderRadius: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700, marginRight: 4, alignSelf: 'center' }}>🪟 Oynachi yo'nalishlari:</span>
          {OYNACHI_SUBSPECS.map(s => (
            <Chip key={s} on={selectedOynachiSubs.includes(s)} onClick={() => toggleOynachiSub(s)}>{s}</Chip>
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
      {(selectedSpecs.length > 0 || selectedOynachiSubs.length > 0 || salaryMin || salaryMax) && (
        <button type="button" onClick={() => { setSelectedSpecs([]); setSelectedOynachiSubs([]); setSalaryMin(''); setSalaryMax(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
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
      <LocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={c => { setMyCoords(c); setNearbyOn(true); }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 2px 12px' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta ishchi topildi
          {nearbyOn && <> · {radiusKm} km radiusda</>}
          {selectedSpecs.length > 0 && <> · {selectedSpecs.join(', ')}</>}
          {selectedOynachiSubs.length > 0 && <> · {selectedOynachiSubs.join(', ')}</>}
        </div>
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="🔎" title="Ishchilar topilmadi" sub="Filterlarni o‘zgartirib ko‘ring." ctaLabel="Tozalash" onCta={() => { setSelectedSpecs([]); setSelectedOynachiSubs([]); }} /></>;

  if (desktop) {
    return (
      <div>
        {Header}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 16 }}>
          {filtered.map(w => (
            <div key={w.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Link href={`/workers/${w.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
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
                </div>
              </Link>
              <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                <div style={{ height: 1, background: 'var(--line)', marginBottom: 14 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <a href={w.phone ? `tel:${w.phone}` : undefined} style={{ textDecoration: 'none', opacity: w.phone ? 1 : .5, pointerEvents: w.phone ? 'auto' : 'none' }}>
                    <Btn variant="soft" style={{ padding: 9, fontSize: 13, width: '100%' }}>📞 Qo‘ng‘iroq</Btn>
                  </a>
                  <a href={tgHref(w)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(w) ? undefined : 'none' }}>
                    <Btn variant="soft" style={{ padding: 9, fontSize: 13, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={20} /> Telegram</Btn>
                  </a>
                </div>
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
        {filtered.map(w => <WorkerCard key={w.id} worker={w} />)}
      </div>
    </div>
  );
};
