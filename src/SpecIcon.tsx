import React from 'react';

const ICONS: Record<string, { src: string; filter?: string }> = {
  Termo: { src: '/images/pvx.png' },
  PVX: { src: '/images/termo.png' },
  'PVX Oq': { src: '/images/termo.png', filter: 'invert(1) brightness(1.8) contrast(0.6) sepia(0) saturate(0)' },
  Alyumin: { src: '/images/alyumin.png' },
  Surma: { src: '/images/surma.png', style: 'cover' },
};

export const SpecIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 64 }) => {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <img
      src={icon.src}
      alt={name}
      style={{ width: size, height: size, objectFit: (icon as any).style === 'cover' ? 'cover' : 'contain', borderRadius: (icon as any).style === 'cover' ? 4 : 0, display: 'block', filter: icon.filter || 'none' }}
    />
  );
};
