import React from 'react';

type Name = 'briefcase' | 'recycle' | 'gear' | 'factory' | 'wrench' | 'hardhat' | 'rainbow' | 'truck';

const SRC: Record<Name, string> = {
  briefcase: '/images/sections/factory.png',
  recycle: '/images/sections/recycle.png',
  gear: '/images/sections/gear.png',
  factory: '/images/sections/briefcase.png',
  wrench: '/images/sections/wrench.png',
  hardhat: '/images/sections/hardhat.png',
  rainbow: '/images/sections/rainbow.png',
  truck: '/images/sections/truck.png',
};

export const SectionIcon: React.FC<{ name: Name; size?: number; color?: string }> = ({ name, size = 22 }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={SRC[name]}
    alt={name}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);
