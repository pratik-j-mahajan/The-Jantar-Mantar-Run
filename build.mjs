// Production build -> dist/
//   one minified JS bundle + one minified CSS file (content-hashed, cache forever on the CDN),
//   a versioned service worker, and cache headers for Netlify (_headers) and Vercel (vercel.json).
// Usage: node build.mjs   (needs esbuild: `npm install` in this folder, or any parent node_modules)
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

// esbuild minifies; if it's unavailable or fails we still ship a working (unminified) bundle,
// since the CDN gzips it anyway. A deploy never fails because of the minifier.
let esbuild = null;
try { esbuild = await import('esbuild'); } catch { console.warn('esbuild not available: building without minification'); }
async function minify(code, loader) {
  if (!esbuild) return code;
  try { return (await esbuild.transform(code, { loader, minify: true, target: loader === 'js' ? 'es2019' : undefined, legalComments: 'none' })).code; }
  catch (err) { console.warn(`minify (${loader}) failed, using original: ${err.message}`); return code; }
}

const ORDER = ['audio', 'sprites', 'engine', 'props', 'world', 'game'];
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

const js = ORDER.map((n) => readFileSync(`js/${n}.js`, 'utf8')).join('\n;\n');
const jsMin = await minify(js, 'js');
const cssMin = await minify(readFileSync('style.css', 'utf8'), 'css');
const jsName = `assets/game.${hash(jsMin)}.js`, cssName = `assets/style.${hash(cssMin)}.css`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });
writeFileSync(`dist/${jsName}`, jsMin);
writeFileSync(`dist/${cssName}`, cssMin);

let html = readFileSync('index.html', 'utf8')
  .replace('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="${cssName}">`)
  .replace(/\n\s*<script src="js\/[a-z]+\.js" defer><\/script>/g, '')
  .replace('</body>', `<script src="${jsName}" defer></script>\n</body>`)
  .replace(/\n\s+/g, '\n');
writeFileSync('dist/index.html', html);
for (const f of ['og-image.jpg', 'apple-touch-icon.png']) copyFileSync(f, `dist/${f}`); // share preview + home-screen icon

const version = hash(jsMin + cssMin + html);
writeFileSync('dist/sw.js', readFileSync('sw.js', 'utf8')
  .replace("const VERSION = 'dev';", `const VERSION = '${version}';`)
  .replace("const ASSETS = ['./'];", `const ASSETS = ${JSON.stringify(['./', jsName, cssName])};`)
  .replace('const HASHED = false;', 'const HASHED = true;'));

writeFileSync('dist/_headers', `/assets/*
  Cache-Control: public, max-age=31536000, immutable
/sw.js
  Cache-Control: no-cache
/
  Cache-Control: public, max-age=0, must-revalidate
/index.html
  Cache-Control: public, max-age=0, must-revalidate
`);
writeFileSync('dist/vercel.json', JSON.stringify({
  headers: [
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
  ],
}, null, 2));

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
const gz = (s) => (gzipSync(s, { level: 9 }).length / 1024).toFixed(1) + ' KB';
console.log(`dist/ ready (version ${version})`);
console.log(`  ${jsName}   ${kb(jsMin)}  (gzip ${gz(jsMin)})`);
console.log(`  ${cssName}  ${kb(cssMin)}  (gzip ${gz(cssMin)})`);
console.log(`  index.html  ${kb(html)}  (gzip ${gz(html)})`);
