import React from 'react';
import { MapPicker } from './MapPicker';
import { Btn } from '../ui';
import { saveCoords } from '../userLocation';

type Coords = { lat: number; lng: number };

export const LocationPickerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onPicked: (c: Coords) => void;
}> = ({ open, onClose, onPicked }) => {
  const [picked, setPicked] = React.useState<Coords | null>(null);

  React.useEffect(() => {
    if (!open) setPicked(null);
  }, [open]);

  if (!open) return null;

  const confirm = () => {
    if (!picked) return;
    saveCoords(picked);
    onPicked(picked);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'grid', placeItems: 'center', zIndex: 2000, padding: 14,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 540, background: '#fff', borderRadius: 18,
        padding: 14, maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>📍 Joylashuvni belgilash</div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f5f5', border: '1px solid var(--line)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          Xarita ustiga bosing yoki "Joylashuvni aniqlash" tugmasini bosing
        </div>
        <MapPicker value={picked} onChange={setPicked} height={360} />
        <Btn full onClick={confirm} style={{ marginTop: 12, padding: 14, opacity: picked ? 1 : 0.5, pointerEvents: picked ? 'auto' : 'none' }}>
          Saqlash
        </Btn>
      </div>
    </div>
  );
};
