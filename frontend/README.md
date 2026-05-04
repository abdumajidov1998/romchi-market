# Romchi Market — Frontend (Next.js 16)

## Setup

```bash
npm install
```

## Dev

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`. The Java backend must be
running on `http://localhost:3001` (see `../backend-java/`); `next.config.ts`
proxies `/api/*` and `/uploads/*` to that origin via rewrites.

To point at a different backend:

```bash
BACKEND_ORIGIN=https://api.example.com npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Notes

- **Leaflet maps**: `react-leaflet` touches `window` at import time, so
  `MapPicker` is loaded via `next/dynamic` with `ssr:false` from
  `components/MapPickerLazy.tsx`. Always import the lazy wrapper, not
  the underlying `MapPicker` component, in pages.
- **Auth**: JWT is kept in `localStorage` (`romchi_token`). All API
  helpers in `lib/api.ts` add the `Authorization: Bearer …` header
  automatically.
- **Routes**: file-based under `app/`. Dynamic segments use
  `[id]` directories. `useParams` is typed `<{ id: string }>` in those.
