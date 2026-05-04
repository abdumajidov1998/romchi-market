#!/usr/bin/env node
/* eslint-disable */
/**
 * One-shot script that ports the remaining src/pages/*.tsx files from
 * the old CRA project into the Next.js app directory. The transforms
 * are purely mechanical:
 *   - prepend 'use client'
 *   - rewrite import paths (../api → @/lib/api, etc.)
 *   - swap react-router-dom hooks/components for next/* equivalents
 *   - rename `useNavigate()` callsites: nav(x) → router.push(x), with
 *     replace:true → router.replace
 *
 * Pages with extra structure (the routes file decides where they go)
 * are listed in PAGE_MAP below. Pages not listed are skipped.
 *
 * Run from `frontend/`:
 *   node scripts/port-pages.js
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..', 'src', 'pages');
const APP = path.resolve(__dirname, '..', 'app');

// Map<source filename → destination relative path under app/>
const PAGE_MAP = {
  'CreateProfile.tsx':       'profile/create/page.tsx',
  'Workers.tsx':             'workers/page.tsx',
  'WorkerProfile.tsx':       'workers/[id]/page.tsx',
  'Jobs.tsx':                'jobs/page.tsx',
  'JobDetail.tsx':           'jobs/[id]/page.tsx',
  'PostJob.tsx':             'post/page.tsx',
  'WasteBuyers.tsx':         'atxod/page.tsx',
  'WasteBuyerProfile.tsx':   'atxod/[id]/page.tsx',
  'CreateWasteBuyer.tsx':    'atxod/create/page.tsx',
  'UslugaProviders.tsx':     'usluga/page.tsx',
  'UslugaProfile.tsx':       'usluga/[id]/page.tsx',
  'CreateUsluga.tsx':        'usluga/create/page.tsx',
  'StanokMasters.tsx':       'stanok/page.tsx',
  'StanokProfile.tsx':       'stanok/[id]/page.tsx',
  'CreateStanok.tsx':        'stanok/create/page.tsx',
  'Delivery.tsx':            'delivery/page.tsx',
  'DeliveryProfile.tsx':     'delivery/[id]/page.tsx',
  'CreateDelivery.tsx':      'delivery/create/page.tsx',
  'StanokAds.tsx':           'stanok-ads/page.tsx',
  'StanokAdDetail.tsx':      'stanok-ads/[id]/page.tsx',
  'CreateStanokAd.tsx':      'stanok-ads/create/page.tsx',
  'CreateStanokAd.edit.tsx': 'stanok-ads/[id]/edit/page.tsx',
  'InstallBrigades.tsx':     'ustanofka/page.tsx',
  'InstallBrigadeProfile.tsx': 'ustanofka/[id]/page.tsx',
  'CreateInstallBrigade.tsx': 'ustanofka/create/page.tsx',
  'Arkachilar.tsx':          'arkachilar/page.tsx',
  'ArkachiProfile.tsx':      'arkachilar/[id]/page.tsx',
  'CreateArkachi.tsx':       'arkachilar/create/page.tsx',
  'Admin.tsx':               'admin/page.tsx',
};

function transform(src, originalPageFile) {
  let s = src;

  // Strip the original "import React from 'react'" if present and ensure
  // we have a single React import.
  // Replace import paths.
  s = s
    // ui from local paths
    .replace(/from\s+['"]\.\.\/ui['"]/g, "from '@/components/ui'")
    .replace(/from\s+['"]\.\.\/api['"]/g, "from '@/lib/api'")
    .replace(/from\s+['"]\.\.\/persist['"]/g, "from '@/lib/persist'")
    .replace(/from\s+['"]\.\.\/userLocation['"]/g, "from '@/lib/userLocation'")
    .replace(/from\s+['"]\.\.\/data['"]/g, "from '@/lib/data'")
    .replace(/from\s+['"]\.\.\/constants['"]/g, "from '@/lib/constants'")
    .replace(/from\s+['"]\.\.\/SpecIcon['"]/g, "from '@/components/SpecIcon'")
    .replace(/from\s+['"]\.\.\/StanokSpecIcon['"]/g, "from '@/components/StanokSpecIcon'")
    .replace(/from\s+['"]\.\.\/Layout['"]/g, "from '@/components/Layout'")
    .replace(/from\s+['"]\.\.\/components\/([A-Za-z0-9_]+)['"]/g, "from '@/components/$1'");

  // Imports from react-router-dom
  // We need to migrate:
  //   - useNavigate -> useRouter
  //   - useParams -> useParams (from next/navigation)
  //   - Link, NavLink -> Link from next/link, NavLink emulated below
  //   - useLocation -> usePathname (we only use .pathname)
  s = s.replace(/import\s*\{([^}]+)\}\s*from\s*['"]react-router-dom['"]\s*;?/g, (_, names) => {
    const list = names.split(',').map(x => x.trim()).filter(Boolean);
    const navHooks = list.filter(n => ['useNavigate', 'useParams', 'useLocation', 'useSearchParams'].includes(n));
    const linkLike = list.filter(n => ['Link', 'NavLink'].includes(n));
    const out = [];
    if (navHooks.length) {
      const mapped = navHooks
        .map(n => n === 'useNavigate' ? 'useRouter' : (n === 'useLocation' ? 'usePathname' : n))
        .filter((v, i, a) => a.indexOf(v) === i);
      out.push(`import { ${mapped.join(', ')} } from 'next/navigation';`);
    }
    if (linkLike.length) {
      // NavLink: we just provide Link; usage rewrite handled separately.
      out.push(`import Link from 'next/link';`);
    }
    return out.join('\n');
  });

  // Replace `const nav = useNavigate();` with `const router = useRouter();`
  s = s.replace(/const\s+nav\s*=\s*useNavigate\(\)\s*;/g, 'const router = useRouter();');
  // Generic: `useNavigate()` → `useRouter()`
  s = s.replace(/useNavigate\(\)/g, 'useRouter()');

  // Replace useLocation usage: `const loc = useLocation();` → `const pathname = usePathname() || '/';`
  s = s.replace(/const\s+(\w+)\s*=\s*useLocation\(\)\s*;/g, 'const $1Pathname = usePathname() || "/";');
  // and any `loc.pathname` → `locPathname`
  s = s.replace(/(\w+)\.pathname/g, (m, name) => name === 'window' ? m : `${name}Pathname`);

  // nav(x) → router.push(x); nav(x, { replace: true }) → router.replace(x)
  s = s.replace(/\bnav\(([^,)]+),\s*\{\s*replace:\s*true\s*\}\s*\)/g, 'router.replace($1)');
  s = s.replace(/\bnav\(/g, 'router.push(');

  // <Link to=...> → <Link href=...>
  s = s.replace(/<Link\s+([^>]*?)to=/g, '<Link $1href=');
  // <NavLink to=...> with style={({isActive})=>...} — we degrade to plain Link with the style applied unconditionally
  s = s.replace(/<NavLink/g, '<Link');
  s = s.replace(/<\/NavLink>/g, '</Link>');

  // strip CRA `process.env.PUBLIC_URL` if any
  s = s.replace(/process\.env\.PUBLIC_URL\s*\+\s*/g, '');

  // useParams<{id:string}>() works as-is in next/navigation client components
  // No additional rewrite needed.

  // Rename the default export based on the source filename
  // - `export const Welcome` already at top — convert to `export default function Welcome`
  const baseName = path.basename(originalPageFile, '.tsx');
  const compName = baseName.replace(/[^A-Za-z0-9_]/g, '_');
  // Pattern A: `export const NAME: React.FC = () => { ... };`
  const reA = new RegExp(`export const ${compName}\\s*:\\s*React\\.FC[^=]*=\\s*\\(\\)\\s*=>\\s*\\{`);
  if (reA.test(s)) {
    s = s.replace(reA, `export default function ${compName}() {`);
    // remove the trailing `;` after the closing }
    // (the function body now ends with `}` instead of `};` — leave as-is, both are valid)
  } else {
    // Pattern B: `export const NAME: React.FC = () => (`  with implicit return — wrap manually
    const reB = new RegExp(`export const ${compName}\\s*:\\s*React\\.FC[^=]*=\\s*\\(\\)\\s*=>\\s*\\(`);
    if (reB.test(s)) {
      s = s.replace(reB, `export default function ${compName}() { return (`);
      // Add a closing `);}` at the end. Replace the final `);\n` (the one that closes the arrow function expression) with `); }\n`
      // For safety, just append at end before any trailing newline.
      s = s.replace(/\);\s*$/m, '); }');
    }
  }

  // Prepend 'use client' if not already
  if (!/^['"]use client['"];?/.test(s)) {
    s = `'use client';\n` + s;
  }

  return s;
}

let written = 0;
for (const [srcName, dest] of Object.entries(PAGE_MAP)) {
  const srcPath = path.join(SRC, srcName.replace('.edit.tsx', '.tsx'));
  if (!fs.existsSync(srcPath)) {
    console.warn('[skip] missing', srcPath);
    continue;
  }
  const destPath = path.join(APP, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const original = fs.readFileSync(srcPath, 'utf8');
  const out = transform(original, srcName);
  fs.writeFileSync(destPath, out);
  written++;
  console.log('[ok]', srcName, '→', dest);
}
console.log(`\nDone: ${written} files written.`);
