import React from 'react';

const ICONS: Record<string, string> = {
  'Kesish stanogi': '/images/stanok/kesish.png',
  'Payvandlash stanogi': '/images/stanok/payvandlash.png',
  'Pressovka stanogi': '/images/stanok/pressovka.png',
  'Frezerlash stanogi': '/images/stanok/frezerlash.png',
  'Kompressor': '/images/stanok/kompressor.png',
  'Arra chaxlovchi': '/images/stanok/arra-chaxlovchi.png',
};

export const StanokSpecIcon: React.FC<{ name: string; size?: number; color?: string; strokeWidth?: number }> = ({ name, size = 24 }) => {
  const src = ICONS[name];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
};
