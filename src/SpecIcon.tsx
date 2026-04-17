import React from 'react';

const SRC: Record<string, string> = {
  Termo: '/images/pvx.png',
  PVX: '/images/termo.png',
  Alyumin: '/images/alyumin.png',
};

export const SpecIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 64 }) => {
  const src = SRC[name];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
};
