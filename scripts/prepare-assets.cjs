// Copies what the landing page needs into assets/: paintings, fonts, the icon, and app screenshots
// (PNG → JPEG). It reads from a checkout of the app repo (cashglome-app, with node_modules installed).
// Run from the app repo:  npx electron ../cashglome-site/scripts/prepare-assets.cjs [screenshots-dir]
// The app repo defaults to the current folder; set CASHGLOME_APP to point elsewhere.
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.env.CASHGLOME_APP || process.cwd());
const out = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(path.join(root, 'public', 'art'))) {
  console.error(`No app repo at ${root} (expected public/art). Run from cashglome-app or set CASHGLOME_APP.`);
  process.exit(1);
}
const shotsDir = process.argv.find((a, i) => i > 1 && fs.existsSync(a) && fs.statSync(a).isDirectory() && !a.endsWith('.cjs'));
const mk = (d) => fs.mkdirSync(d, { recursive: true });

app.whenReady().then(() => {
  // Paintings: all at 960px, the full-bleed ones also at 1800px.
  mk(path.join(out, 'art', 'lg'));
  for (const f of fs.readdirSync(path.join(root, 'public', 'art', 'md'))) {
    fs.copyFileSync(path.join(root, 'public', 'art', 'md', f), path.join(out, 'art', f));
  }
  for (const id of ['harvesters', 'matthew', 'hunters', 'moneylender', 'wedding', 'arnolfini', 'babel']) {
    fs.copyFileSync(path.join(root, 'public', 'art', id + '.jpg'), path.join(out, 'art', 'lg', id + '.jpg'));
  }
  // Fonts: the app's own typefaces, self-hosted (no third-party font requests).
  mk(path.join(out, 'fonts'));
  const fonts = {
    'schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2': 'grotesk.woff2',
    'newsreader/files/newsreader-latin-opsz-normal.woff2': 'newsreader.woff2',
    'newsreader/files/newsreader-latin-opsz-italic.woff2': 'newsreader-italic.woff2',
    'inter/files/inter-latin-wght-normal.woff2': 'inter.woff2',
  };
  for (const [from, to] of Object.entries(fonts)) fs.copyFileSync(path.join(root, 'node_modules', '@fontsource-variable', from), path.join(out, 'fonts', to));
  // Icon.
  const icon = nativeImage.createFromPath(path.join(root, 'build', 'icon.png'));
  fs.writeFileSync(path.join(out, 'icon-256.png'), icon.resize({ width: 256, height: 256, quality: 'best' }).toPNG());
  fs.writeFileSync(path.join(out, 'icon-64.png'), icon.resize({ width: 64, height: 64, quality: 'best' }).toPNG());
  // Screenshots of the real app.
  if (shotsDir) {
    mk(path.join(out, 'shots'));
    for (const f of fs.readdirSync(shotsDir).filter((x) => x.endsWith('.png'))) {
      const img = nativeImage.createFromPath(path.join(shotsDir, f));
      fs.writeFileSync(path.join(out, 'shots', f.replace(/\.png$/, '.jpg')), img.toJPEG(84));
    }
  }
  console.log('assets ready');
  app.quit();
});
