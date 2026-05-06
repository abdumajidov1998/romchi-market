'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Btn, Badge, Chip, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { usePersistedState } from '@/lib/persist';
import { useIsDesktop } from '@/components/Layout';
import { api } from '@/lib/api';
import { STANOK_SPECS as SPECS } from '@/lib/constants';
import { StanokSpecIcon } from '@/components/StanokSpecIcon';
import { getSavedCoords, requestCoords } from '@/lib/userLocation';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { SectionIcon } from '@/components/SectionIcon';

const RADII = [5, 10, 15, 25, 50];
const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '---';

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const MasterCard: React.FC<{ m: any }> = ({ m }) => (
  <Card>
    <Link href={`/stanok/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b style={{ fontSize: 15 }}>{m.name}</b>
            {m.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {m.city} · {m.district}</div>
          {m.experience && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>🔧 {m.experience}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {m.urgent && <Badge tone="amber">⚡ 24/7</Badge>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {(m.specs || []).map((s: string) => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>
            <StanokSpecIcon name={s} size={14} /> {s}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {(m.specs || []).some((s: string) => s !== 'Arra chaxlovchi') && (
          <div style={{ padding: '6px 10px', background: '#ECFDF5', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>Diagnostika: </span>
            <b style={{ color: '#10B981' }}>{m.priceDiagnostika ? `${fmt(m.priceDiagnostika)} so'm` : 'Kelishiladi'}</b>
          </div>
        )}
        {(m.specs || []).includes('Arra chaxlovchi') && (
          <div style={{ padding: '6px 10px', background: '#FEF3C7', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>Charxlash: </span>
            <b style={{ color: '#D97706' }}>{m.priceCharxlash ? `${fmt(m.priceCharxlash)} so'm` : 'Kelishiladi'}</b>
          </div>
        )}
        <div style={{ padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>Remont: </span>
          <b style={{ color: 'var(--ink)' }}>Kelishiladi</b>
        </div>
      </div>
    </Link>

    <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={m.phone ? `tel:${m.phone}` : undefined} style={{ flex: 1, textDecoration: 'none', opacity: m.phone ? 1 : .5, pointerEvents: m.phone ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13 }}>📞 Qo'ng'iroq</Btn>
      </a>
      <a href={tgHref(m)} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', display: tgHref(m) ? undefined : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={18} /> Telegram</Btn>
      </a>
    </div>
  </Card>
);

export default function StanokMasters() {
  const desktop = useIsDesktop();
  const router = useRouter();
  const [selectedSpecs, setSelectedSpecs] = usePersistedState<string[]>('filters:stanok:specs', []);
  const [specOpen, setSpecOpen] = React.useState(false);
  const [urgentOnly, setUrgentOnly] = usePersistedState('filters:stanok:urgentOnly', false);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [nearbyOn, setNearbyOn] = usePersistedState('filters:stanok:nearbyOn', false);
  const [radiusKm, setRadiusKm] = usePersistedState('filters:stanok:radiusKm', 15);
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

  const toggleSpec = (s: string) => setSelectedSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.stanokMasters({})
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

  const filtered = React.useMemo(() => {
    let result = list;
    if (selectedSpecs.length > 0) result = result.filter(m => (m.specs || []).some((s: string) => selectedSpecs.includes(s)));
    if (urgentOnly) result = result.filter(m => m.urgent);
    if (nearbyOn && myCoords) {
      result = result
        .map(m => ({ ...m, distanceKm: (typeof m.lat === 'number' && typeof m.lng === 'number') ? haversine(myCoords, { lat: m.lat, lng: m.lng }) : Infinity }))
        .filter(m => m.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return result;
  }, [list, selectedSpecs, urgentOnly, nearbyOn, myCoords, radiusKm]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.push('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <SectionIcon name="gear" size={14} /> Stanok xizmati
          </div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Stanok remont</div>
        </div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>{geoBusy ? '⏳...' : '📍 Yaqin atrofdagilar'}</Chip>
        <Chip on={specOpen || selectedSpecs.length > 0} onClick={() => setSpecOpen(!specOpen)}>
          {selectedSpecs.length > 0 ? `⚙️ ${selectedSpecs.length} ta tanlandi` : '⚙️ Stanok turi'}
        </Chip>
        <Chip on={urgentOnly} onClick={() => setUrgentOnly(!urgentOnly)}>⚡ Shoshilinch 24/7</Chip>
      </div>
      {nearbyOn && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Radius:</span>
          {RADII.map(r => <Chip key={r} on={radiusKm === r} onClick={() => setRadiusKm(r)}>{r} km</Chip>)}
        </div>
      )}
      <LocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={c => { setMyCoords(c); setNearbyOn(true); }}
      />
      {specOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {SPECS.map(s => {
            const on = selectedSpecs.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSpec(s)} style={{
                padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                background: on ? 'var(--blue-50)' : '#fff',
                border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                position: 'relative',
              }}>
                <StanokSpecIcon name={s} size={28} color={on ? 'var(--blue)' : 'var(--ink)'} />
                <div style={{ fontWeight: 700, fontSize: 10, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{s}</div>
                {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 2px 12px' }}>
        <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta usta
        {nearbyOn && <> · {radiusKm} km</>}
        {selectedSpecs.length > 0 && <> · {selectedSpecs.join(', ')}</>}
        {urgentOnly && <> · 24/7</>}
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda..." sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="⚙️" title="Ustalar topilmadi" sub={nearbyOn ? `${radiusKm} km radiusda topilmadi` : 'Birinchi bo\'lib ro\'yxatdan o\'ting!'} /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(m => <MasterCard key={m.id} m={m} />)}
      </div>
    </div>
  );
};
