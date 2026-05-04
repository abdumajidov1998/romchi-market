'use client';
import dynamic from 'next/dynamic';

// react-leaflet touches `window` at import time, so any page that mounts
// the picker must skip SSR. Wrap once here so callers can `import { MapPicker }`
// without thinking about it.
export const MapPicker = dynamic(
  () => import('./MapPicker').then(m => m.MapPicker),
  { ssr: false, loading: () => <div style={{ height: 200, background: '#f5f5f5', borderRadius: 14 }} /> }
);
