import React from 'react';

// `size` is the rendered HEIGHT in px; the SVG's 937:300 viewBox keeps the
// width proportional automatically. Original logo asset (untouched) lives at
// /public/logo.svg.
export const Logo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/logo.svg"
    alt="Romchi"
    style={{ height: size, width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
  />
);
