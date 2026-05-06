'use client';
import React from 'react';
import Link from 'next/link';
import { Card, Btn, Badge, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { usePersistedState } from '@/lib/persist';
import { useIsDesktop } from '@/components/Layout';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Chip } from '@/components/ui';
import { SpecIcon } from '@/components/SpecIcon';
import { WASTE_MATERIALS as MATERIALS } from '@/lib/constants';
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

const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '—';

const BuyerCard: React.FC<{ b: any }> = ({ b }) => (
  <Card>
    <Link href={`/atxod/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b style={{ fontSize: 15 }}>{b.name}</b>
            {b.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {b.city} · {b.district}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {b.verified && <Badge tone="green">Tasdiqlangan</Badge>}
        </div>
      </div>

      {(() => {
        const items = MATERIALS.filter(m => (b[m.key] || 0) > 0);
        if (items.length === 0) return null;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 12 }}>
            {items.map(m => (
              <div key={m.key} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 6px',
                background: 'var(--blue-50)', borderRadius: 10, textAlign: 'center',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 12 }}>{m.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 13 }}>{fmt(b[m.key])} so'm</span>
              </div>
            ))}
          </div>
        );
      })()}
    </Link>

    <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={b.phone ? `tel:${b.phone}` : undefined} style={{ flex: 1, textDecoration: 'none', opacity: b.phone ? 1 : .5, pointerEvents: b.phone ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13 }}>📞 Qo'ng'iroq</Btn>
      </a>
      <a href={tgHref(b)} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', display: tgHref(b) ? undefined : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={18} /> Telegram</Btn>
      </a>
    </div>
  </Card>
);

export default function WasteBuyers() {
  const desktop = useIsDesktop();
  const router = useRouter();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [nearbyOn, setNearbyOn] = usePersistedState('filters:waste:nearbyOn', false);
  const [radiusKm, setRadiusKm] = usePersistedState<number>('filters:waste:radiusKm', 15);
  const [myCoords, setMyCoords] = React.useState<{ lat: number; lng: number } | null>(getSavedCoords());
  const [geoBusy, setGeoBusy] = React.useState(false);
  const [selectedMaterials, setSelectedMaterials] = usePersistedState<string[]>('filters:waste:materials', []);
  const [matOpen, setMatOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const toggleMat = (k: string) => setSelectedMaterials(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);

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
    api.wasteBuyers()
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

  const filtered = React.useMemo(() => {
    let result = list;
    if (selectedMaterials.length > 0) {
      result = result.filter(b => selectedMaterials.some(k => (b[k] || 0) > 0));
    }
    if (nearbyOn && myCoords) {
      result = result
        .map(b => {
          if (typeof b.lat === 'number' && typeof b.lng === 'number') {
            return { ...b, distanceKm: haversine(myCoords, { lat: b.lat, lng: b.lng }) };
          }
          return { ...b, distanceKm: Infinity };
        })
        .filter(b => b.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return result;
  }, [list, selectedMaterials, nearbyOn, myCoords, radiusKm]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.push('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <SectionIcon name="recycle" size={14} /> Atxod xizmati
          </div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Atxod oluvchilar</div>
        </div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>
          {geoBusy ? '⏳ Aniqlanmoqda…' : '📍 Yaqin atrofdagilar'}
        </Chip>
        <Chip on={matOpen || selectedMaterials.length > 0} onClick={() => setMatOpen(!matOpen)}>
          {selectedMaterials.length > 0 ? `♻️ ${selectedMaterials.length} ta tanlandi` : '♻️ Material turi'}
        </Chip>
      </div>
      {matOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {MATERIALS.map(m => {
            const on = selectedMaterials.includes(m.key);
            return (
              <button key={m.key} type="button" onClick={() => toggleMat(m.key)} style={{
                padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                background: on ? 'var(--blue-50)' : '#fff',
                border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                position: 'relative',
              }}>
                <SpecIcon name={m.spec} size={28} />
                <div style={{ fontWeight: 700, fontSize: 11, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{m.label}</div>
                {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
              </button>
            );
          })}
        </div>
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
          <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta atxod oluvchi
          {nearbyOn && <> · {radiusKm} km radiusda</>}
          {selectedMaterials.length > 0 && <> · {selectedMaterials.map(k => MATERIALS.find(m => m.key === k)?.label).filter(Boolean).join(', ')}</>}
        </div>
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="♻️" title="Atxod oluvchilar topilmadi" sub={nearbyOn ? `${radiusKm} km radiusda topilmadi. Radiusni kattalashtiring.` : 'Birinchi bo\'lib ro\'yxatdan o\'ting!'} /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(b => <BuyerCard key={b.id} b={b} />)}
      </div>
    </div>
  );
};
