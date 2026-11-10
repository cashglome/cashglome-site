/* CashGlome landing page: motion and interactions.
   Lenis smooths the native scroll; GSAP ScrollTrigger maps scroll position to each scene.
   Pinning is plain CSS `position: sticky`, so the compositor keeps the art still and nothing jitters.
   Only transforms and opacity are animated. No trackers, no third-party requests. */
(() => {
  window.__motion = true;

  /* ───────── Edit these before publishing ───────── */
  const CONFIG = {
    contact: 'hello@cashglome.app',            // placeholder inbox for deck requests
    web: 'app/',                               // where the web app is hosted
    downloads: {
      windows: { label: 'Windows', status: 'available', url: 'downloads/CashGlome-Setup-4.0.0.exe', note: 'Download · 94 MB' },
      mac:     { label: 'macOS', status: 'soon', soon: 'The signed Mac build is next. Windows and the web app are ready today.' },
      ios:     { label: 'iPhone & iPad', status: 'soon', soon: 'The iPhone app is in testing. We’ll announce it here first.' },
      android: { label: 'Android', status: 'soon', soon: 'Android comes after iPhone. Until then, the web app works on any phone.' },
    },
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = root.classList.contains('calm');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const span = (p, a, b) => clamp((p - a) / (b - a), 0, 1);           // 0→1 as p goes a→b
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const motion = !!(window.gsap && window.ScrollTrigger);
  if (!motion) { root.classList.remove('js'); }
  else { gsap.registerPlugin(ScrollTrigger); if (window.SplitText) gsap.registerPlugin(SplitText); ScrollTrigger.config({ ignoreMobileResize: true }); }

  /* ───────── Toast ───────── */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3800);
  }

  /* ───────── Downloads, links ───────── */
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
  const primary = platform && CONFIG.downloads[platform].status === 'available' ? platform : 'windows';

  function renderDownloads(box) {
    if (box.dataset.downloads === 'hero') {
      // The hero keeps one clear choice; every platform is listed further down.
      const d = CONFIG.downloads[primary];
      const phone = platform === 'ios' || platform === 'android';
      const get = `<a class="dl${phone ? '' : ' primary'}" href="${d.url}" download><svg aria-hidden="true"><use href="#i-${primary}"/></svg><span><b>Download for ${d.label}</b><small>${d.note}</small></span></a>`;
      const web = `<a class="dl${phone ? ' primary' : ''}" href="${CONFIG.web}"><svg aria-hidden="true"><use href="#i-web"/></svg><span><b>Open in your browser</b><small>${phone ? 'Works on your phone' : 'No install'}</small></span></a>`;
      box.innerHTML = phone ? web : get + web;
      if (platform && platform !== primary) box.insertAdjacentHTML('beforeend', `<p class="dl-note">${CONFIG.downloads[platform].label} is coming soon. <a href="#everywhere">See every platform</a></p>`);
      return;
    }
    const order = ['windows', 'mac', 'ios', 'android'];
    if (platform) order.sort((a, b) => (b === platform) - (a === platform));
    box.innerHTML = '';
    for (const id of order) {
      const d = CONFIG.downloads[id];
      const live = d.status === 'available';
      const a = document.createElement('a');
      a.className = 'dl' + (live && id === primary ? ' primary' : '');
      a.innerHTML = `<svg aria-hidden="true"><use href="#i-${id}"/></svg><span><b>${d.label}</b><small>${live ? d.note : 'Coming soon'}</small></span>`;
      if (live) { a.href = d.url; a.setAttribute('download', ''); }
      else {
        a.href = '#download';
        a.setAttribute('aria-label', `${d.label}: coming soon`);
        a.addEventListener('click', (e) => { e.preventDefault(); toast(d.soon); });
      }
      box.appendChild(a);
    }
  }
  $$('[data-downloads]').forEach(renderDownloads);
  $$('[data-web-link]').forEach((a) => { a.href = CONFIG.web; });
  $$('[data-platform-link]').forEach((a) => { const d = CONFIG.downloads[a.dataset.platformLink]; a.href = d.url; a.setAttribute('download', ''); });
  $$('[data-contact]').forEach((a) => {
    a.href = `mailto:${CONFIG.contact}` + (a.dataset.subject ? '?subject=' + encodeURIComponent(a.dataset.subject) : '');
    if ('showEmail' in a.dataset) a.textContent = CONFIG.contact;
  });

  /* ───────── Torn paper: a ragged edge with a lighter fibre rim ───────── */
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
  function noise(seed) {
    const r = rng(seed), pts = Array.from({ length: 97 }, r);
    return (x) => { const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f); return lerp(pts[((i % 97) + 97) % 97], pts[(((i + 1) % 97) + 97) % 97], t); };
  }
  $$('[data-tear]').forEach((box, k) => {
    const W = 1600, H = 80, seed = 41 + k * 977;
    const big = noise(seed), mid = noise(seed + 3), fib = noise(seed + 5), jit = rng(seed + 9);
    let edge = '', rim = '';
    for (let x = 0; x <= W; x += 2.5 + jit() * 5) {
      const y = H * .14 + big(x / 240) * H * .44 + mid(x / 44) * H * .2 + (jit() - .5) * H * .06;
      const r = y - (1.5 + fib(x / 18) * 5.5);
      edge += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      rim += ` L${x.toFixed(1)} ${r.toFixed(1)}`;
    }
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path fill="#FBF8F1" d="M0 ${H}${rim} L${W} ${H} Z"/><path fill="currentColor" d="M0 ${H}${edge} L${W} ${H} Z"/></svg>`;
  });

  /* ───────── The reader: type a line, see what it understood ───────── */
  const form = $('[data-reader]');
  const input = $('#reader-input');
  const out = $('[data-reader-out]');
  let typing = null, userTyped = false;

  function showChips(text) {
    if (!window.CGReader) return;
    const html = CGReader.chipsHTML(CGReader.parse(text));
    if (out.dataset.last === html) return;
    out.dataset.last = html;
    out.innerHTML = html;
    if (motion && !calm && out.children.length) gsap.fromTo(out.children, { y: 10, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: .6, ease: 'expo.out', stagger: .07 });
  }
  const EXAMPLES = ['bolt 6k, lunch 4.5k, got paid 350k', 'coffee 4.50 and groceries 62 yesterday', 'suya 2k, danfo 500, mum sent 20k', 'netflix 15.49, haircut 25, moved 200 to savings'];
  async function demo() {
    if (calm) { input.value = EXAMPLES[0]; showChips(input.value); return; }
    const token = (typing = {});
    for (let n = 0; ; n = (n + 1) % EXAMPLES.length) {
      const text = EXAMPLES[n];
      for (let i = 1; i <= text.length; i++) {
        if (typing !== token) return;
        input.value = text.slice(0, i);
        if (/[,\s]$/.test(input.value) || i === text.length) showChips(input.value);
        await wait(34 + Math.random() * 46);
      }
      showChips(text);
      await wait(2800);
      if (typing !== token) return;
      while (input.value.length) { if (typing !== token) return; input.value = input.value.slice(0, -3); await wait(14); }
      out.innerHTML = ''; out.dataset.last = '';
      await wait(380);
    }
  }
  function stopDemo() {
    if (!typing) return;
    typing = null;
    if (!userTyped) { input.value = ''; out.innerHTML = ''; out.dataset.last = ''; }
  }
  let debounce;
  input.addEventListener('focus', stopDemo);
  input.addEventListener('pointerdown', stopDemo);
  input.addEventListener('input', () => { userTyped = true; clearTimeout(debounce); debounce = setTimeout(() => showChips(input.value), 180); });
  form.addEventListener('submit', (e) => {
    e.preventDefault(); stopDemo(); userTyped = true; showChips(input.value);
    if (!input.value.trim()) { out.innerHTML = '<span class="chip hint">Try “lunch 12, uber 9, got paid 2,400”</span>'; out.dataset.last = ''; }
  });

  /* ───────── Restoration slider ───────── */
  const frame = $('[data-restorer-frame]');
  const handle = $('[data-handle]');
  let rx = .5, dragging = false;
  function setX(v) { rx = clamp(v, 0, 1); frame.style.setProperty('--x', rx.toFixed(4)); handle.setAttribute('aria-valuenow', Math.round(rx * 100)); }
  if (frame) {
    const fromEvent = (e) => { const r = frame.getBoundingClientRect(); const pad = parseFloat(getComputedStyle(frame).paddingLeft) || 0; setX((e.clientX - r.left - pad) / (r.width - pad * 2)); };
    frame.addEventListener('pointerdown', (e) => { dragging = true; frame.setPointerCapture(e.pointerId); fromEvent(e); });
    frame.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    frame.addEventListener('pointerup', () => { dragging = false; });
    frame.addEventListener('pointercancel', () => { dragging = false; });
    handle.addEventListener('keydown', (e) => { const k = { ArrowLeft: -.05, ArrowRight: .05, Home: -1, End: 1 }[e.key]; if (k !== undefined) { e.preventDefault(); setX(rx + k); } });
  }

  /* ───────── FAQ: smooth open and close ───────── */
  $$('[data-faq] details').forEach((d) => {
    const s = $('summary', d), a = $('.faq-a', d);
    s.addEventListener('click', (e) => {
      if (!motion || calm) return;
      e.preventDefault();
      if (d.open) gsap.to(a, { height: 0, duration: .5, ease: 'expo.out', onComplete: () => { d.open = false; a.style.height = ''; ScrollTrigger.refresh(); } });
      else { d.open = true; gsap.fromTo(a, { height: 0 }, { height: 'auto', duration: .7, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() }); }
    });
  });

  /* ───────── Market chart (drawn from the cited figures: $2.9B in 2025 growing 17.5% a year) ───────── */
  const chart = $('[data-chart]');
  if (chart) {
    const pts = Array.from({ length: 8 }, (_, i) => { const v = 2.9 * Math.pow(1.1755, i); return [i / 7 * 600, 219 - (v / 9.4) * 205]; });
    const line = 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L');
    $('.curve', chart).setAttribute('d', line);
    $('.area', chart).setAttribute('d', `${line} L600 219.5 L0 219.5 Z`);
    const [d0, d1] = $$('.dot', chart);
    d0.setAttribute('cx', pts[0][0]); d0.setAttribute('cy', pts[0][1]);
    d1.setAttribute('cx', pts[7][0]); d1.setAttribute('cy', pts[7][1]);
  }

  if (!motion) { if (frame) setX(.5); return; }

  /* ───────── Smooth scroll ───────── */
  let lenis = null;
  if (!calm && window.Lenis) {
    lenis = new Lenis({ lerp: .09, wheelMultiplier: .95, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => (t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2) });
    else target.scrollIntoView();
    history.replaceState(null, '', id);
  });

  /* ───────── Art: cover the stage, place the additions in perspective ───────── */
  // Maps a w×h element onto a four-point quad (TL, TR, BR, BL) with a CSS matrix3d.
  function quadMatrix(q, w, h) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
    return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${x0},${y0},0,1)`;
  }
  const arts = $$('[data-art]');
  function layoutArt(art) {
    const pin = art.closest('.pin');
    const W = pin.clientWidth, H = pin.clientHeight;
    const [rw, rh] = art.dataset.ratio.split('/').map(Number), ar = rw / rh;   // ratio is the image's pixel size
    const narrow = W < 760;
    const [fx, fy] = ((narrow && art.dataset.focusNarrow) || art.dataset.focus).split(',').map(Number);
    const w = Math.max(W, H * ar), h = w / ar;
    const left = clamp(W / 2 - fx * w, W - w, 0), top = clamp(H / 2 - fy * h, H - h, 0);
    // Rasterise at the painting's own resolution and scale down, so the camera's push-in stays sharp.
    const K = clamp(rw / w, 1, 2);
    art.style.width = w * K + 'px'; art.style.height = h * K + 'px';
    art._b = { W, H, w, h, left, top, narrow, K };
    art.style.transform = `translate3d(${left}px,${top}px,0) scale(${(1 / K).toFixed(5)})`;
  }
  // Shows canvas point (px, py) at screen point (tx, ty) at scale s, never exposing the stage edges.
  function camera(art, s, px, py, tx, ty) {
    const b = art._b, w = b.w * s, h = b.h * s;
    const X = clamp(tx - px * w, b.W - w, 0), Y = clamp(ty - py * h, b.H - h, 0);
    art.style.transform = `translate3d(${X.toFixed(2)}px,${Y.toFixed(2)}px,0) scale(${(s / b.K).toFixed(5)})`;
    return { x: X + px * w, y: Y + py * h, X, Y, w, h };
  }
  ScrollTrigger.addEventListener('refreshInit', () => arts.forEach(layoutArt));
  arts.forEach(layoutArt);

  // A dim layer on each pinned scene, for when the paper rises over it.
  $$('.chapter .pin').forEach((pin) => { const d = document.createElement('div'); d.className = 'dim'; pin.appendChild(d); });

  const chapterScrub = (ch, len, render) => {
    const st = ScrollTrigger.create({ trigger: ch, start: 'top top', end: () => '+=' + innerHeight * len, scrub: true, onUpdate: (self) => render(self.progress), onRefresh: (self) => render(self.progress) });
    render(calm ? 1 : 0);
    return st;
  };
  const setOpacity = (el, v) => { if (el) el.style.opacity = v.toFixed(3); };
  const setY = (el, y, extra = '') => { if (el) el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)${extra}`; };

  /* Chapter one: the camera leans into her book of hours; its miniature becomes today's accounts */
  (() => {
    const ch = $('.chapter-write'), art = $('[data-art]', ch);
    const giant = $('[data-giant]', ch), swash = $('[data-swash]', ch), label = $('.chapter-label', ch);
    const folio = $('[data-folio]', ch), vellum = $('[data-vellum]', ch), inks = $$('[data-ink]', folio);
    const quad = folio.dataset.quad.split(' ').map((c) => c.split(',').map((v) => Number(v) / 100));
    const FW = 380, FH = 460;
    const P = { x: quad.reduce((a, q) => a + q[0], 0) / 4, y: quad.reduce((a, q) => a + q[1], 0) / 4 };
    // Each line is written in turn: [start, end] in scroll progress.
    const times = [[.30, .37], [.37, .47], [.47, .55], [.57, .64], [.64, .71], [.71, .78], [.80, .88]];
    const render = (p) => {
      const b = art._b, e = ease(span(p, 0, .92));
      const S = b.narrow ? 3.3 : 2.8;
      const start = { x: b.left + P.x * b.w, y: b.top + P.y * b.h };
      const end = { x: b.W * (b.narrow ? .54 : .64), y: b.H * (b.narrow ? .42 : .5) };
      const c = camera(art, lerp(1, S, e), P.x, P.y, lerp(start.x, end.x, e), lerp(start.y, end.y, e));
      folio.style.transform = quadMatrix(quad.map(([qx, qy]) => [c.X + qx * c.w, c.Y + qy * c.h]), FW, FH);
      setOpacity(vellum, ease(span(p, .12, .3)));
      inks.forEach((el, i) => {
        const [a, z] = times[i] || [.8, .88], v = span(p, a, z);
        el.style.opacity = v > 0 ? 1 : 0;
        el.style.clipPath = `inset(-30% ${(100 - v * 100).toFixed(2)}% -30% -4%)`;   // ink runs left to right
      });
      const g = span(p, .04, .3);
      setOpacity(giant, 1 - g); setY(giant, -60 * easeOut(g));
      setOpacity(label, 1 - g);
      const sw = span(p, .34, .52);
      setOpacity(swash, sw); setY(swash, 24 * (1 - easeOut(sw)));
    };
    chapterScrub(ch, 1.4, calm ? () => render(1) : render);
  })();

  /* Chapter two: into the convex mirror, out into the app */
  (() => {
    const ch = $('.chapter-see'), art = $('[data-art]', ch);
    const mirror = $('[data-mirror-screen]', ch), curve = $('[data-mirror-curve]', ch);
    const giant = $('[data-giant]', ch), swash = $('[data-swash]', ch), label = $('.chapter-label', ch);
    const [mx, my, mr] = art.dataset.mirror.split(',').map((v) => Number(v) / 100);
    let R = 1;
    ScrollTrigger.addEventListener('refresh', () => { const b = art._b; R = Math.hypot(b.W, b.H) / 2; mirror.style.setProperty('--R', R + 'px'); });
    const render = (p) => {
      const b = art._b;
      if (!b) return;
      R = Math.hypot(b.W, b.H) / 2;
      mirror.style.setProperty('--R', R + 'px');
      const r0 = mr * b.w;
      const q = span(p, .16, .9), e = ease(q);
      const s = Math.pow((R * 1.03) / r0, e);             // exponential zoom feels even
      const start = { x: b.left + mx * b.w, y: b.top + my * b.h };
      const at = camera(art, s, mx, my, lerp(start.x, b.W / 2, e), lerp(start.y, b.H / 2, e));
      const k = (r0 * s) / R;
      art.style.visibility = k >= .999 ? 'hidden' : '';            // fully inside the mirror: stop drawing the room
      mirror.style.transform = `translate3d(${(at.x - b.W / 2).toFixed(2)}px,${(at.y - b.H / 2).toFixed(2)}px,0) scale(${k.toFixed(5)})`;
      setOpacity(mirror, span(p, .1, .22));
      setOpacity(curve, 1 - span(q, .35, .85));
      const g = span(p, .06, .26);
      setOpacity(giant, 1 - g); setY(giant, -50 * easeOut(g));
      setOpacity(label, 1 - g);
      setOpacity(swash, span(p, .02, .12) * (1 - span(p, .26, .4)));
    };
    chapterScrub(ch, 1.9, calm ? () => render(.2) : render);
  })();

  /* Chapter three: Caravaggio's light crosses the room as the question is asked */
  (() => {
    const ch = $('.chapter-ask'), art = $('[data-art]', ch), dark = $('[data-dark]', ch);
    const giant = $('[data-giant]', ch), swash = $('[data-swash]', ch), question = $('[data-question]', ch);
    const label = $('.chapter-label', ch);
    question.innerHTML = question.textContent.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
    const words = $$('.w', question);
    let lit = -1;
    const render = (p) => {
      const b = art._b;
      const e = ease(span(p, 0, 1));
      camera(art, lerp(1, 1.07, e), .32, .58, lerp(b.left + .32 * b.w, b.W * .4, e), lerp(b.top + .58 * b.h, b.H * .6, e));
      const l = ease(span(p, .04, .8));
      dark.style.transform = `translate3d(${lerp(27, -15, l).toFixed(2)}%,0,0)`;
      const n = calm ? words.length : Math.round(span(p, .2, .6) * words.length);
      if (n !== lit) { lit = n; words.forEach((w, i) => w.classList.toggle('lit', i < n)); }
      setOpacity(swash, span(p, .62, .78)); setY(swash, 18 * (1 - easeOut(span(p, .62, .78))));
      setY(giant, -30 * span(p, 0, 1)); setY(label, -30 * span(p, 0, 1));
    };
    chapterScrub(ch, 1.6, calm ? () => render(1) : render);
  })();

  /* Paper rising over a chapter: the scene recedes and dims beneath it */
  $$('.rise').forEach((rise) => {
    const ch = rise.previousElementSibling;
    if (!ch || !ch.matches('.chapter')) return;
    const scene = $('[data-scene]', ch), dim = $('.dim', ch);
    ScrollTrigger.create({
      trigger: rise, start: 'top bottom', end: 'top top', scrub: true,
      onUpdate: (self) => { const p = self.progress; scene.style.transform = `scale(${(1 - .06 * p).toFixed(4)})`; dim.style.opacity = (.7 * p).toFixed(3); },
    });
  });

  if (calm) {
    $$('[data-fade], [data-hero-in]').forEach((el) => { el.style.opacity = 1; });
    $$('.hero-title .line').forEach((el) => { el.style.transform = 'none'; });
    demo();
    setX(.5);
    return;
  }

  /* ───────── Hero: the painting unveils, the title rises, then the reader starts ───────── */
  const heroImg = $('.hero-img');
  gsap.set('[data-hero-in]', { y: 18 });
  const ready = Promise.all([document.fonts ? document.fonts.ready : null, heroImg.decode ? heroImg.decode().catch(() => {}) : null]);
  Promise.race([ready, wait(2200)]).then(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
    tl.to('[data-hero-frame]', { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.55 }, 0)
      .fromTo(heroImg, { scale: 1.32 }, { scale: 1.04, duration: 2.1, ease: 'expo.out' }, .05)
      .to('.hero-sky', { opacity: 1, duration: 1.2, ease: 'power2.out' }, .75)
      .to('.hero-title .line', { y: 0, duration: 1.3, ease: 'expo.out', stagger: .1 }, .8)
      .to('[data-hero-in]', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .07 }, 1.1)
      .add(() => { demo(); heroScroll(); }, 1.6);
  });
  function heroScroll() {
    gsap.fromTo(heroImg, { yPercent: 0, scale: 1.04 }, { yPercent: 14, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('[data-hero-content]', { y: -110, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ───────── Reveals ───────── */
  ScrollTrigger.batch('[data-fade]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.15, ease: 'expo.out', stagger: .08, overwrite: true }),
  });
  if (window.SplitText) {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      $$('[data-lines]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines', mask: 'lines', autoSplit: true,
          onSplit(self) {
            (self.masks || []).forEach((m) => { m.style.paddingBottom = '.09em'; m.style.marginBottom = '-.09em'; });
            return gsap.from(self.lines, { yPercent: 112, duration: 1.3, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
          },
        });
      });
    });
  }
  $$('[data-count]').forEach((el) => {
    const n = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(o, { v: n, duration: 1.6, ease: 'expo.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
    el.textContent = '0';
  });

  /* ───────── Write, more: the ledger window rises with a slight tilt ───────── */
  gsap.fromTo('[data-rise-frame]', { y: 90, rotateX: 8, transformPerspective: 1400 }, { y: 0, rotateX: 0, ease: 'none', scrollTrigger: { trigger: '[data-rise-frame]', start: 'top bottom', end: 'center 55%', scrub: true } });

  /* ───────── Restoration: a first cleaning pass when it comes into view ───────── */
  if (frame) {
    setX(.96);
    ScrollTrigger.create({ trigger: frame, start: 'top 70%', once: true, onEnter: () => { const o = { v: .96 }; gsap.to(o, { v: .42, duration: 2.2, ease: 'expo.inOut', onUpdate: () => { if (!dragging) setX(o.v); } }); } });
  }

  /* ───────── The month, fanned out ───────── */
  const fan = $('[data-fan]');
  if (fan) {
    const [l, c, r] = ['-1', '0', '1'].map((k) => $(`[data-fan-card="${k}"]`, fan));
    const off = () => Math.min(innerWidth * .26, 380);
    gsap.timeline({ scrollTrigger: { trigger: fan, start: 'top 92%', end: 'top 30%', scrub: true, invalidateOnRefresh: true } })
      .fromTo(l, { x: 0, y: 70, rotate: 0, scale: .92 }, { x: () => -off(), y: 34, rotate: -6, scale: .84, ease: 'none' }, 0)
      .fromTo(r, { x: 0, y: 70, rotate: 0, scale: .92 }, { x: () => off(), y: 34, rotate: 6, scale: .84, ease: 'none' }, 0)
      .fromTo(c, { y: 90 }, { y: 0, ease: 'none' }, 0);
  }

  /* ───────── The working, entered line by line ───────── */
  const ledgerRows = $$('[data-ledger-row]');
  if (ledgerRows.length) {
    gsap.set(ledgerRows, { opacity: 0, x: -12 });
    ScrollTrigger.create({ trigger: '[data-ledger]', start: 'top 75%', once: true, onEnter: () => gsap.to(ledgerRows, { opacity: 1, x: 0, duration: .8, ease: 'expo.out', stagger: .11 }) });
  }

  /* ───────── Devices ───────── */
  gsap.fromTo('[data-laptop]', { y: 80 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '[data-devices]', start: 'top bottom', end: 'center 60%', scrub: true } });
  gsap.fromTo('[data-iphone]', { y: 220, rotate: 5 }, { y: 0, rotate: 0, ease: 'none', scrollTrigger: { trigger: '[data-devices]', start: 'top bottom', end: 'center 55%', scrub: true } });

  /* ───────── Painting details drift inside their frames ───────── */
  $$('[data-drift]').forEach((img) => {
    const o = { v: -7 };
    gsap.to(o, { v: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }, onUpdate: () => img.style.setProperty('--drift', o.v.toFixed(2) + '%') });
  });

  /* ───────── Market line draws itself ───────── */
  if (chart) {
    const curve = $('.curve', chart), area = $('.area', chart), dots = $$('.dot', chart);
    const len = curve.getTotalLength();
    gsap.set(curve, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set([area, ...dots], { opacity: 0 });
    ScrollTrigger.create({ trigger: chart, start: 'top 80%', once: true, onEnter: () => {
      gsap.timeline().to(dots[0], { opacity: 1, duration: .3 }).to(curve, { strokeDashoffset: 0, duration: 1.8, ease: 'expo.inOut' }, 0).to(area, { opacity: 1, duration: 1.2 }, .8).to(dots[1], { opacity: 1, duration: .4 }, 1.6);
    } });
  }

  /* ───────── Begin: the wedding settles ───────── */
  gsap.fromTo('[data-finale-img]', { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ───────── Nav and contents: colour follows the page, nav steps aside while reading ───────── */
  const nav = $('[data-nav]'), contents = $('[data-contents]');
  const toned = $$('[data-tone]');
  const links = $$('a', contents);
  const targets = links.map((a) => $(a.getAttribute('href')));
  const hero = $('.hero');
  // Section bounds are measured once per refresh, so scrolling never forces a layout read.
  let bounds = [], marks = [];
  function measure() {
    const sy = lenis ? lenis.scroll : scrollY;
    bounds = toned.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + sy, bottom: r.bottom + sy, tone: el.dataset.tone }; });
    marks = targets.map((t) => (t ? t.getBoundingClientRect().top + sy : Infinity));
  }
  function toneAt(y) {
    const at = (lenis ? lenis.scroll : scrollY) + y;
    let tone = 'light';
    for (const b of bounds) if (b.top <= at && b.bottom > at) tone = b.tone;
    return tone;
  }
  let lastY = 0, onIdx = -2, heroH = hero.offsetHeight;
  ScrollTrigger.addEventListener('refreshInit', () => { heroH = hero.offsetHeight; });
  function frameUpdate() {
    const y = lenis ? lenis.scroll : scrollY, vh = innerHeight;
    nav.classList.toggle('dark', toneAt(30) === 'dark');
    const down = y > lastY + 2, up = y < lastY - 2;
    if (y < 160 || up) nav.classList.remove('hide'); else if (down) nav.classList.add('hide');
    lastY = y;
    contents.classList.toggle('show', y > heroH * .7);
    contents.classList.toggle('dark', toneAt(vh - 60) === 'dark');
    let on = -1;
    marks.forEach((m, i) => { if (m < y + vh * .5) on = i; });
    if (on !== onIdx) { onIdx = on; links.forEach((a, i) => a.classList.toggle('on', i === on)); }
  }
  let queued = false;
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; frameUpdate(); }); } };
  if (lenis) lenis.on('scroll', queue); else addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  ScrollTrigger.addEventListener('refresh', () => { measure(); frameUpdate(); });
  measure();
  frameUpdate();

  // Chapter art is lazy; once it decodes nothing moves, but refresh once everything is in.
  addEventListener('load', () => ScrollTrigger.refresh());
})();
