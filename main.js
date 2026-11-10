/* CashGlome landing page. No framework, no trackers, no third-party requests. */

/* ───────── Edit these before publishing ───────── */
const CONFIG = {
  contact: 'hello@cashglome.app',          // placeholder: the inbox for deck requests
  web: 'app/',                             // where the web app is hosted
  downloads: {
    windows: { label: 'Windows', status: 'available', url: 'downloads/CashGlome-Setup-4.0.0.exe', note: 'Download · 94 MB' },
    mac:     { label: 'macOS', status: 'soon', note: 'Coming soon', soon: 'The signed Mac build is next. Windows and the web app are ready today.' },
    ios:     { label: 'iPhone & iPad', status: 'soon', note: 'Coming soon', soon: 'The iPhone app is in testing. We’ll announce it here first.' },
    android: { label: 'Android', status: 'soon', note: 'Coming soon', soon: 'Android comes after iPhone. Until then, the web app works on any phone.' },
  },
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

/* ───────── Toast ───────── */
const toastEl = $('[data-toast]');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
}

/* ───────── Platform detection + download buttons ───────── */
function detectPlatform() {
  const ua = navigator.userAgent || '';
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(p) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/mac/i.test(p) || /mac os x/i.test(ua)) return 'mac';
  if (/win/i.test(p) || /windows/i.test(ua)) return 'windows';
  return null;
}
const platform = detectPlatform();

// Reuse the icons drawn in the page's own markup.
const icons = {};
$$('.hero .dl').forEach((a) => { icons[a.dataset.platform] = a.querySelector('svg').outerHTML; });

function renderDownloads(box) {
  const order = ['windows', 'mac', 'ios', 'android'];
  if (platform) order.sort((a, b) => (b === platform) - (a === platform));
  box.innerHTML = '';
  for (const id of order) {
    const d = CONFIG.downloads[id];
    const a = document.createElement('a');
    a.className = 'dl';
    a.dataset.platform = id;
    const live = d.status === 'available';
    if (live) {
      a.href = d.url;
      a.setAttribute('download', '');
      if (id === (platform && CONFIG.downloads[platform].status === 'available' ? platform : 'windows')) a.classList.add('primary');
    } else {
      a.href = '#download';
      a.classList.add('soon');
      a.setAttribute('aria-label', `${d.label}: coming soon`);
      a.addEventListener('click', (e) => { e.preventDefault(); toast(d.soon); });
    }
    a.innerHTML = `${icons[id] || ''}<span><b>${d.label}</b><small>${live ? d.note : 'Coming soon'}</small></span>`;
    box.appendChild(a);
  }
}
$$('[data-downloads]').forEach(renderDownloads);

$$('[data-web-link]').forEach((a) => { a.href = CONFIG.web; });
$$('[data-contact]').forEach((a) => {
  const subject = a.textContent.includes('deck') ? '?subject=' + encodeURIComponent('CashGlome — investor deck') : '';
  a.href = `mailto:${CONFIG.contact}${subject}`;
});

const navCta = $('[data-os-label]');
if (platform && CONFIG.downloads[platform].status === 'available') {
  navCta.textContent = `Download for ${CONFIG.downloads[platform].label}`;
  navCta.href = CONFIG.downloads[platform].url;
  navCta.setAttribute('download', '');
}

/* ───────── Torn paper edges ───────── */
function tearPath(seed, w, h, lift) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let d = `M0 ${h} L0 ${(h * .45 + rnd() * h * .3 - lift).toFixed(1)}`;
  for (let x = 0; x < w;) {
    x += 4 + rnd() * 12;
    let y = h * .3 + rnd() * h * .42;
    if (rnd() < .08) y -= h * .22;           // the occasional deeper rip
    d += ` L${Math.min(x, w).toFixed(1)} ${(y - lift).toFixed(1)}`;
  }
  return d + ` L${w} ${h} Z`;
}
const tearColors = { paper: 'var(--paper)', night: 'var(--night)', ink: 'var(--inkbg)' };
$$('[data-tear]').forEach((svg, i) => {
  const w = 1600, h = 34;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.style.color = tearColors[svg.dataset.tear] || 'var(--paper)';
  const light = svg.dataset.tear === 'paper';
  svg.innerHTML =
    `<path class="fiber" fill="${light ? '#FBF7EE' : 'rgba(255,255,255,.08)'}" d="${tearPath(7 + i * 131, w, h, 3)}"/>` +
    `<path fill="currentColor" d="${tearPath(7 + i * 131, w, h, 0)}"/>`;
});

/* ───────── Hero composer: types an example, then shows what it understood ───────── */
const EXAMPLES = [
  { text: 'bolt 6k, lunch 4.5k, got paid 350k', chips: [['−₦6,000', 'Getting around'], ['−₦4,500', 'Eating out'], ['+₦350,000', 'Salary', 'plus']] },
  { text: 'coffee 4.50 and groceries 62 at trader joe’s', chips: [['−$4.50', 'Eating out'], ['−$62.00', 'Groceries']] },
  { text: 'suya 2k, danfo 500, mum sent 20k', chips: [['−₦2,000', 'Eating out'], ['−₦500', 'Getting around'], ['+₦20,000', 'Gifts received', 'plus']] },
  { text: 'netflix 15.49 yesterday', chips: [['−£15.49', 'Subscriptions', '', 'Yesterday']] },
  { text: 'moved 200 to savings', chips: [['€200', 'Savings & investing', 'save']] },
];
const typer = $('[data-typer]');
const read = $('[data-read]');
const composer = $('.composer');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chipHTML = ([amt, cat, kind = '', when = '']) =>
  `<span class="chip ${kind}"><b>${amt}</b>${cat}${when ? ` <small>· ${when}</small>` : ''}</span>`;

function showChips(ex, instant) {
  read.innerHTML = ex.chips.map(chipHTML).join('');
  read.classList.add('open');
  const chips = $$('.chip', read);
  chips.forEach((c, i) => (instant ? c.classList.add('in') : setTimeout(() => c.classList.add('in'), 120 + i * 140)));
}
let heroVisible = true;
async function typeLoop() {
  if (reduced) { showChips(EXAMPLES[0], true); return; }
  typer.textContent = '';
  await wait(700);
  for (let n = 0; ; n = (n + 1) % EXAMPLES.length) {
    const ex = EXAMPLES[n];
    while (!heroVisible) await wait(400);
    for (const ch of ex.text) { typer.textContent += ch; await wait(28 + Math.random() * 46); }
    await wait(380);
    composer.classList.add('sent');
    setTimeout(() => composer.classList.remove('sent'), 260);
    showChips(ex);
    await wait(2900);
    $$('.chip', read).forEach((c) => c.classList.remove('in'));
    await wait(260);
    read.classList.remove('open');
    while (typer.textContent.length) { typer.textContent = typer.textContent.slice(0, -2); await wait(12); }
    await wait(300);
  }
}
typeLoop();

/* ───────── Reveal on scroll ───────── */
$$('.growth i').forEach((b, i) => b.style.setProperty('--i', i));
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    revealer.unobserve(e.target);
    if (e.target.matches('.stat')) countUp(e.target.querySelector('[data-count]'));
  }
}, { threshold: .18, rootMargin: '0px 0px -8% 0px' });
$$('.reveal, .complaints').forEach((el) => revealer.observe(el));

function countUp(el) {
  if (!el || reduced) return;
  const target = +el.dataset.count;
  const unit = el.querySelector('span');
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / 1300);
    const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
    el.firstChild.nodeValue = String(v);
    if (p < 1) requestAnimationFrame(step);
  };
  el.firstChild.nodeValue = '0';
  if (unit) el.appendChild(unit);
  requestAnimationFrame(step);
}

/* ───────── Ask demo: thinks, then answers ───────── */
const chat = $('[data-chat]');
if (chat && !reduced) {
  chat.classList.add('pending');
  const label = $('[data-thinking] span', chat);
  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    setTimeout(() => { label.textContent = 'Counting on this device…'; }, 1100);
    setTimeout(() => chat.classList.remove('pending'), 2200);
  }, { threshold: .45 }).observe(chat);
}

/* ───────── Restoration slider ───────── */
const frame = $('[data-restorer] .restorer-frame');
const handle = $('[data-handle]');
let x = .58;
function setX(v) {
  x = Math.max(0, Math.min(1, v));
  frame.style.setProperty('--x', x.toFixed(4));
  handle.setAttribute('aria-valuenow', Math.round(x * 100));
}
if (frame) {
  const fromEvent = (e) => {
    const r = frame.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(frame).paddingLeft) || 0;
    setX((e.clientX - r.left - pad) / (r.width - pad * 2));
  };
  let dragging = false;
  frame.addEventListener('pointerdown', (e) => { dragging = true; frame.setPointerCapture(e.pointerId); fromEvent(e); });
  frame.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
  const stop = () => { dragging = false; };
  frame.addEventListener('pointerup', stop);
  frame.addEventListener('pointercancel', stop);
  handle.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: -.05, ArrowRight: .05, Home: -1, End: 1 }[e.key];
    if (k !== undefined) { e.preventDefault(); setX(x + k); }
  });
  // A short "cleaning" pass the first time it comes into view.
  if (!reduced) {
    setX(.94);
    new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const run = (t) => {
        if (dragging) return;
        const p = Math.min(1, (t - t0) / 1800);
        setX(.94 - (.94 - .52) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, { threshold: .5 }).observe(frame);
  }
}

/* ───────── Scroll: nav theme, contents index, product story, hero parallax ───────── */
const nav = $('[data-nav]');
const index = $('[data-index]');
const indexLinks = $$('a', index);
const chapters = indexLinks.map((a) => $(a.getAttribute('href')));
const themed = $$('[data-theme]');
const hero = $('.hero');
const heroImg = $('.hero-art img');
const story = $('[data-story]');
const steps = $$('.step', story);
const shots = $$('.shot', story);
const progress = $('.stage-progress', story);
let activeStep = -1;

function themeAt(y) {
  for (const el of themed) {
    const r = el.getBoundingClientRect();
    if (r.top <= y && r.bottom > y) return el.dataset.theme;
  }
  return 'light';
}

function onScroll() {
  const vh = innerHeight;
  nav.classList.toggle('dark', themeAt(36) === 'dark');

  // Contents index
  const show = scrollY > vh * .7;
  index.classList.toggle('show', show);
  index.classList.toggle('dark', themeAt(vh / 2) === 'dark');
  let on = -1;
  chapters.forEach((c, i) => { if (c && c.getBoundingClientRect().top < vh * .45) on = i; });
  indexLinks.forEach((a, i) => a.classList.toggle('on', i === on));

  // Product story: the step nearest the middle of the screen leads
  const sr = story.getBoundingClientRect();
  if (sr.bottom > 0 && sr.top < vh) {
    let best = 0, bestD = Infinity;
    steps.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh * .55);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best !== activeStep) {
      activeStep = best;
      steps.forEach((s, i) => s.classList.toggle('on', i === best));
      shots.forEach((s, i) => s.classList.toggle('on', i === best));
    }
    const p = Math.max(0, Math.min(1, (vh * .55 - sr.top) / sr.height));
    progress.style.setProperty('--p', p.toFixed(3));
  }

  // Hero: the painting drifts and deepens as you leave it
  const hr = hero.getBoundingClientRect();
  heroVisible = hr.bottom > 0;
  if (!reduced && heroVisible) {
    const p = Math.max(0, Math.min(1, -hr.top / hr.height));
    heroImg.style.transform = `translateY(${(p * 12).toFixed(2)}%) scale(${(1.04 + p * .08).toFixed(4)})`;
  }
}
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; onScroll(); });
}, { passive: true });
addEventListener('resize', onScroll);
onScroll();

// Start the product story on its first frame, and load the screenshots ahead of time.
shots.forEach((s) => { s.loading = 'eager'; });
if (activeStep < 0) { steps[0].classList.add('on'); shots[0].classList.add('on'); }
