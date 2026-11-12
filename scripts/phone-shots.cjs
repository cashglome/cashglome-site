// Takes the landing page's product shots from the real app, at phone size.
// Start the app first (in cashglome-app: npm run dev), then from that folder:
//   npx electron ../cashglome-site/scripts/phone-shots.cjs [http://localhost:5173]
// Writes assets/shots/p-*.jpg (412 x 892 at 3x). Everything shown is the app's own example month.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const url = process.argv.find((a) => /^https?:\/\//.test(a)) || 'http://localhost:5173/';
const out = path.join(__dirname, '..', 'assets', 'shots');
const W = 412, H = 892;
app.disableHardwareAcceleration();
setTimeout(() => { console.log('timeout'); app.exit(1); }, 150000);

const HELPERS = `
  window.__set = (el, v) => { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  window.__click = (t, sel) => { const e = [...document.querySelectorAll(sel || 'button, a, [role=button]')].find((e) => e.getAttribute('aria-label') === t || e.textContent.trim().replace(/\\s+/g, ' ').includes(t));
    if (e) e.click(); return !!e; };
  true;`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, show: false, x: -3000, y: 0, frame: false, skipTaskbar: true, webPreferences: { backgroundThrottling: false } });
  win.showInactive(); // a hidden window stops painting, and then there is nothing to photograph
  const dbg = win.webContents.debugger;
  dbg.attach('1.3');
  await win.loadURL(url); // the phone size can only be set once a page is there
  await dbg.sendCommand('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 3, mobile: true });
  await dbg.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true });
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shot = async (name) => {
    const { data } = await Promise.race([dbg.sendCommand('Page.captureScreenshot', { format: 'jpeg', quality: 86 }), new Promise((_, no) => setTimeout(() => no(new Error('no frame for ' + name)), 15000))]);
    fs.writeFileSync(path.join(out, `p-${name}.jpg`), Buffer.from(data, 'base64'));
    console.log('shot', name);
  };
  const fresh = async (zone, locale) => {
    await dbg.sendCommand('Emulation.setTimezoneOverride', { timezoneId: zone });
    await dbg.sendCommand('Emulation.setLocaleOverride', { locale }).catch(() => {});
    await win.loadURL(url);
    await js('localStorage.clear(); sessionStorage.clear(); true');
    await win.loadURL(url);
    await wait(2500);
    await js(HELPERS);
  };
  const type = (sel, text) => js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.focus(); __set(el, ${JSON.stringify(text)}); return true; })()`);
  fs.mkdirSync(out, { recursive: true });

  // First run, in four hands: the line is read as it is typed.
  for (const [name, zone, locale, line] of [
    ['first-en', 'America/New_York', 'en-US', 'coffee 4.50, bus 2.80, got paid 3,200'],
    ['first-zh', 'Asia/Shanghai', 'zh-CN', '午饭35，打车20，收到工资8000'],
    ['first-es', 'America/Mexico_City', 'es-MX', 'taxi 80, me pagaron 15 mil'],
    ['first-ko', 'Asia/Seoul', 'ko-KR', '점심 8000원, 월급 250만원'],
  ]) {
    await fresh(zone, locale);
    console.log(name, 'typed', await type('.ph-first input', line));
    await wait(900);
    await js('document.activeElement && document.activeElement.blur(); true');
    await wait(400);
    await shot(name);
  }

  // The example month.
  await fresh('America/New_York', 'en-US');
  console.log('example', await js(`__click('Look around an example month')`));
  await wait(3500);
  await js(HELPERS);
  await shot('home');

  console.log('composer', await js(`(() => { const el = document.querySelector('.composer textarea, .composer input, textarea'); if (!el) return 'none'; el.focus(); __set(el, 'lunch 14, sent mum 60, got paid 3,200'); return el.tagName; })()`));
  await wait(1200);
  await shot('write');
  await js(`(() => { const el = document.querySelector('.composer textarea, .composer input, textarea'); if (el) { __set(el, ''); el.blur(); } return true; })()`);
  await wait(600);

  console.log('ledger', await js(`__click('Ledger', '.ph-tabs button')`));
  await wait(1500);
  await shot('ledger');
  console.log('gallery', await js(`__click('Gallery', '.ph-tabs button')`));
  await wait(1800);
  await shot('gallery');
  console.log('chapter', await js(`__click('Chapter', '.ph-tabs button')`));
  await wait(800);
  console.log('more', await js(`__click('More')`));
  await wait(900);
  await shot('more');
  console.log('read', await js(`__click('Read the chapter', '.ph-row')`));
  await wait(2200);
  await shot('read');
  const steps = await js(`(() => { const all = [...document.querySelectorAll('*')].filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 200);
    all.sort((a, b) => b.scrollHeight - a.scrollHeight); window.__sc = all[0] || document.scrollingElement; return [__sc.className || __sc.tagName, __sc.scrollHeight, __sc.clientHeight]; })()`);
  console.log('scroller', steps);
  for (let i = 1; i <= 7; i++) {
    await js(`__sc.scrollTo(0, ${i} * 780); true`);
    await wait(1100);
    await shot('read-' + i);
  }
  console.log('back', await js(`__click('Back')`));
  await wait(800);
  console.log('ask', await js(`__click('Ask about your money')`));
  await wait(1500);
  await shot('ask');
  console.log('question', await js(`__click('Where did my money go this month?')`));
  await wait(3500);
  await shot('ask-answer');
  app.exit(0);
});
