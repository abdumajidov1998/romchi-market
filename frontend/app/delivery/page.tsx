'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Btn, Badge, Chip, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { usePersistedState } from '@/lib/persist';
import { useIsDesktop } from '@/components/Layout';
import { api } from '@/lib/api';
import { DELIVERY_VEHICLES } from '@/lib/constants';
import { getSavedCoords, requestCoords } from '@/lib/userLocation';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { SectionIcon } from '@/components/SectionIcon';

const RADII = [5, 10, 15, 25, 50];

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const vehicleFor = (m: any): { src: string | null; icon: string } => {
  const preset = DELIVERY_VEHICLES.find(v => v.name === m.vehicleModel);
  return { src: preset?.image || null, icon: preset?.icon || '🚚' };
};

const VehicleThumb: React.FC<{ src: string | null; icon: string; size?: number }> = ({ src, icon, size = 64 }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: '#EFF6FF', display: 'grid', placeItems: 'center', fontSize: Math.round(size * 0.55), flexShrink: 0 }}>
        {icon}
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: '#EFF6FF', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

const DriverCard: React.FC<{ d: any }> = ({ d }) => (
  <Card>
    <Link href={`/delivery/${d.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 12 }}>
      <VehicleThumb {...vehicleFor(d)} size={64} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <b style={{ fontSize: 15 }}>{d.name}</b>
          {d.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <SectionIcon name="truck" size={14} color="var(--muted)" /> {d.vehicleModel}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {d.city} · {d.district}</div>
        {d.verified && <div style={{ marginTop: 6 }}><Badge tone="green">Tasdiqlangan</Badge></div>}
      </div>
    </Link>

    <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={d.phone ? `tel:${d.phone}` : undefined} style={{ flex: 1, textDecoration: 'none', opacity: d.phone ? 1 : .5, pointerEvents: d.phone ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13 }}>📞 Qo'ng'iroq</Btn>
      </a>
      <a href={tgHref(d)} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', display: tgHref(d) ? undefined : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={18} /> Telegram</Btn>
      </a>
    </div>
  </Card>
);

export default function Delivery() {
  const desktop = useIsDesktop();
  const router = useRouter();
  const [selectedVehicles, setSelectedVehicles] = usePersistedState<string[]>('filters:delivery:vehicles', []);
  const [vehicleOpen, setVehicleOpen] = React.useState(false);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [nearbyOn, setNearbyOn] = usePersistedState('filters:delivery:nearbyOn', false);
  const [radiusKm, setRadiusKm] = usePersistedState('filters:delivery:radiusKm', 15);
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

  const toggleVehicle = (v: string) => setSelectedVehicles(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.deliveryDrivers()
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

  const filtered = React.useMemo(() => {
    let result = list;
    if (selectedVehicles.length > 0) result = result.filter(d => selectedVehicles.includes(d.vehicleModel));
    if (nearbyOn && myCoords) {
      result = result
        .map(d => ({ ...d, distanceKm: (typeof d.lat === 'number' && typeof d.lng === 'number') ? haversine(myCoords, { lat: d.lat, lng: d.lng }) : Infinity }))
        .filter(d => d.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return result;
  }, [list, selectedVehicles, nearbyOn, myCoords, radiusKm]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.push('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <SectionIcon name="truck" size={14} color="var(--muted)" /> Dostavka xizmati
          </div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Dostavkachilar</div>
        </div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>{geoBusy ? '⏳...' : '📍 Yaqin atrofdagilar'}</Chip>
        <Chip on={vehicleOpen || selectedVehicles.length > 0} onClick={() => setVehicleOpen(!vehicleOpen)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <SectionIcon name="truck" size={16} color="currentColor" />
            {selectedVehicles.length > 0 ? `${selectedVehicles.length} ta tanlandi` : 'Avtomobil turi'}
          </span>
        </Chip>
        {(nearbyOn || selectedVehicles.length > 0) && (
          <Chip onClick={() => { setNearbyOn(false); setSelectedVehicles([]); setVehicleOpen(false); }}>✕ Tozalash</Chip>
        )}
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
      {vehicleOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {DELIVERY_VEHICLES.map(v => {
            const on = selectedVehicles.includes(v.name);
            return (
              <button key={v.name} type="button" onClick={() => toggleVehicle(v.name)} style={{
                padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                background: on ? 'var(--blue-50)' : '#fff',
                border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                position: 'relative',
              }}>
                <VehicleThumb src={v.image} icon={v.icon} size={48} />
                <div style={{ fontWeight: 700, fontSize: 11, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{v.name}</div>
                {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 2px 12px' }}>
        <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta haydovchi
        {nearbyOn && <> · {radiusKm} km</>}
        {selectedVehicles.length > 0 && <> · {selectedVehicles.join(', ')}</>}
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda..." sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="🚐" title="Haydovchilar topilmadi" sub={nearbyOn ? `${radiusKm} km radiusda topilmadi` : 'Birinchi bo\'lib ro\'yxatdan o\'ting!'} /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(d => <DriverCard key={d.id} d={d} />)}
      </div>
    </div>
  );
};
