const KEY = 'romchi_user_coords';

export type Coords = { lat: number; lng: number };

export const getSavedCoords = (): Coords | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (typeof c.lat === 'number' && typeof c.lng === 'number') return c;
  } catch {}
  return null;
};

export const saveCoords = (c: Coords) => {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
};

export const clearCoords = () => {
  try { localStorage.removeItem(KEY); } catch {}
};

export const requestCoords = (): Promise<Coords> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Brauzeringiz lokatsiyani qo'llab-quvvatlamaydi"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveCoords(c);
        resolve(c);
      },
      err => reject(new Error(err.code === 1 ? "Lokatsiyaga ruxsat bermadingiz" : "Lokatsiyani aniqlab bo'lmadi")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });

// Returns saved coords if available, otherwise prompts and saves.
export const ensureCoords = async (): Promise<Coords> => {
  const saved = getSavedCoords();
  if (saved) return saved;
  return requestCoords();
};
