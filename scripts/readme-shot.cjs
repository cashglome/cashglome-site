// Renders the picture at the top of README.md: the landing page's first screen, with rounded corners
// (GitHub ignores CSS in READMEs, so the corners are cut into a transparent PNG).
// Run from this folder, with Electron available (e.g. from a cashglome-app checkout):
//   npx electron scripts/readme-shot.cjs [url]        default url: https://cashglome.vercel.app/
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const url = process.argv.find((a) => /^https?:\/\//.test(a)) || 'https://cashglome.vercel.app/';
const out = path.join(__dirname, '..', 'docs', 'hero.png');
app.disableHardwareAcceleration();
setTimeout(() => { console.log('timeout'); app.exit(1); }, 60000);

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { offscreen: true, backgroundThrottling: false } });
  await win.loadURL(url);
  await win.webContents.insertCSS('html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; } html { scrollbar-width: none; }');
  // Wait for the hero's entrance, and for its typing demo to finish a whole line and show the reading.
  await win.webContents.executeJavaScript(`new Promise((ok) => { const t0 = Date.now(); (function poll() {
    const i = document.querySelector('#reader-input');
    const done = i && /\\d/.test(i.value) && i.value.length > 12 && document.querySelector('.reader-out *, [data-reader-out] *, .reader-chips *');
    if (done || Date.now() - t0 > 20000) setTimeout(ok, 1200); else setTimeout(poll, 250);
  })(); })`);
  const flat = (await win.webContents.capturePage()).toDataURL();
  const round = await win.webContents.executeJavaScript(`new Promise((ok) => { const img = new Image(); img.onload = () => {
    const W = 1280, H = Math.round(img.height * W / img.width);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.beginPath(); g.roundRect(0, 0, W, H, 28); g.clip(); g.drawImage(img, 0, 0, W, H); ok(c.toDataURL('image/png'));
  }; img.src = ${JSON.stringify(flat)}; })`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(round.split(',')[1], 'base64'));
  console.log('wrote', out);
  app.quit();
});
