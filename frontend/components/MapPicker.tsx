'use client';
import React from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const VILOYAT_CENTERS: Record<string, [number, number]> = {
  'Toshkent': [41.3111, 69.2797],
  'Toshkent viloyati': [41.1, 69.35],
  'Samarqand': [39.6542, 66.9597],
  'Buxoro': [39.7681, 64.4556],
  'Andijon': [40.7821, 72.3442],
  'Namangan': [40.9983, 71.6726],
  'Farg‘ona': [40.3864, 71.7864],
  'Qashqadaryo': [38.8606, 65.7894],
  'Surxondaryo': [37.2242, 67.2783],
  'Xorazm': [41.5500, 60.6333],
  'Navoiy': [40.0844, 65.3792],
  'Jizzax': [40.1158, 67.8422],
  'Sirdaryo': [40.4444, 68.7833],
  'Qoraqalpog‘iston': [42.4611, 59.6083],
};

const UZ_CENTER: [number, number] = [41.3775, 64.5853];

type Coords = { lat: number; lng: number };

const Recenter: React.FC<{ center: [number, number]; zoom: number; bump: number }> = ({ center, zoom, bump }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump]);
  return null;
};

const ClickCatcher: React.FC<{ onPick: (c: Coords) => void }> = ({ onPick }) => {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
};

export const MapPicker: React.FC<{
  value: Coords | null;
  onChange: (c: Coords) => void;
  city?: string;
  district?: string;
  height?: number;
}> = ({ value, onChange, city, height = 200 }) => {
  const [recenterBump, setRecenterBump] = React.useState(0);
  const [detecting, setDetecting] = React.useState(false);
  const [geoError, setGeoError] = React.useState('');

  const fallback: [number, number] = React.useMemo(() => {
    if (value) return [value.lat, value.lng];
    if (city && VILOYAT_CENTERS[city]) return VILOYAT_CENTERS[city];
    return UZ_CENTER;
  }, [city, value]);

  const fallbackZoom = value ? 15 : city && VILOYAT_CENTERS[city] ? 11 : 6;

  React.useEffect(() => {
    if (!value) setRecenterBump(b => b + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const detect = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Brauzeringiz lokatsiyani qo‘llab-quvvatlamaydi'); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRecenterBump(b => b + 1);
        setDetecting(false);
      },
      err => {
        setGeoError(err.code === 1 ? 'Lokatsiyaga ruxsat bermadingiz' : 'Lokatsiyani aniqlab bo‘lmadi');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
      <button type="button" onClick={detect} disabled={detecting} style={{
        width: '100%', padding: '14px', background: 'var(--blue-50)', border: 'none',
        borderBottom: '1px solid var(--line)', color: 'var(--blue)', fontSize: 15, fontWeight: 700,
        cursor: detecting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {detecting ? '⏳ Aniqlanmoqda…' : '📍 Joylashuvni aniqlash'}
      </button>
      {geoError && <div style={{ padding: '8px 14px', fontSize: 12, color: '#DC2626', fontWeight: 500, background: '#FEE2E2' }}>⚠️ {geoError}</div>}
      <div style={{ height, position: 'relative' }}>
        <MapContainer center={fallback} zoom={fallbackZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCatcher onPick={onChange} />
          <Recenter center={fallback} zoom={fallbackZoom} bump={recenterBump} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const p = m.getLatLng();
                  onChange({ lat: p.lat, lng: p.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)' }}>
        {value ? <>📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</> : 'Tugmani bosing yoki xarita ustiga bosib marker qo‘ying'}
      </div>
    </div>
  );
};
