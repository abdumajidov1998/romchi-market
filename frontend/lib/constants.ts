// Centralized SPECS / SPEC_ICONS / MATERIALS constants. Grouped by domain.

export const WORKER_SPECS = ['Termo', 'PVX', 'Alyumin', 'Oynachi'] as const;
export const OYNACHI_SUBSPECS = ['Oyna kesuvchi', 'Paket yopuvchi', 'Germetika qiluvchi'] as const;
export const USLUGA_SPECS = ['Termo', 'PVX', 'Alyumin', 'Surma'] as const;
export const INSTALL_BRIGADA_SPECS = ['Termo', 'PVX', 'Alyumin', 'JP fasad'] as const;
export const ARKACHI_SPECS = ['Termo', 'PVX', 'Alyumin', 'JP fasad'] as const;

export const STANOK_SPECS = [
  'Kesish stanogi',
  'Payvandlash stanogi',
  'Pressovka stanogi',
  'Frezerlash stanogi',
  'Kompressor',
  'Arra chaxlovchi',
] as const;

export const STANOK_SPEC_ICONS: Record<string, string> = {
  'Kesish stanogi': '🔪',
  'Payvandlash stanogi': '⚡',
  'Pressovka stanogi': '🏗',
  'Frezerlash stanogi': '⚙️',
  'Kompressor': '💨',
  'Arra chaxlovchi': '🪚',
};

export const WASTE_MATERIALS = [
  { key: 'priceTermo', label: 'Termo', spec: 'Termo' },
  { key: 'pricePvxOq', label: 'PVX Oq', spec: 'PVX Oq' },
  { key: 'pricePvxRangli', label: 'PVX Rangli', spec: 'PVX' },
  { key: 'priceAlyumin', label: 'Alyumin', spec: 'Alyumin' },
  { key: 'priceAlikabond', label: 'Alikafon', spec: 'Alikabond' },
] as const;

export const DELIVERY_VEHICLES = [
  { name: 'Labo', icon: '🛻', image: '/images/vehicles/labo.png' },
  { name: 'Changan', icon: '🚐', image: '/images/vehicles/changan.png' },
  { name: 'Gazel', icon: '🚐', image: '/images/vehicles/gazel.png' },
  { name: 'Gazel Next', icon: '🚐', image: '/images/vehicles/gazel-next.png' },
  { name: 'Isuzu', icon: '🚚', image: '/images/vehicles/isuzu.png' },
  { name: 'Hyundai Porter', icon: '🛻', image: '/images/vehicles/porter.png' },
  { name: 'Kia Bongo', icon: '🛻', image: '/images/vehicles/bongo.png' },
  { name: 'JAC', icon: '🚚', image: '/images/vehicles/jac.png' },
  { name: 'Foton', icon: '🚚', image: '/images/vehicles/foton.png' },
] as const;
