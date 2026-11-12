/* CashGlome landing page. Nothing here is needed to read the page: it adds the live reader
   (reader.js, built from the app's own money reader), the varnish slider, the menu and small reveals. */
(() => {
  window.__cg = true;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ───────── Header: clear over the hero, parchment once the page moves ───────── */
  const nav = $('[data-nav]');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 12 || !$('.hero'));
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menu = $('[data-menu]'), menuBtn = $('[data-menu-open]');
  const setMenu = (open) => {
    if (!menu) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('solid', open || scrollY > 12 || !$('.hero'));
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  menuBtn?.addEventListener('click', () => setMenu(menu.hidden));
  menu?.addEventListener('click', (e) => { if (e.target === menu || e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ───────── Whose money: the visitor's own currency, guessed from where the device is ───────── */
  const ZONES = [[/^Africa\/Lagos$/, 'NGN'], [/^Africa\/Nairobi$/, 'KES'], [/^Africa\/Accra$/, 'GHS'], [/^Africa\/Johannesburg$/, 'ZAR'], [/^Africa\/Cairo$/, 'EGP'], [/^Africa\/Dar_es_Salaam$/, 'TZS'],
    [/^Africa\/(Dakar|Abidjan|Bamako|Lome|Porto-Novo|Ouagadougou|Niamey)$/, 'XOF'], [/^Asia\/(Kolkata|Calcutta)$/, 'INR'], [/^Asia\/Tokyo$/, 'JPY'], [/^Asia\/(Shanghai|Chongqing|Urumqi)$/, 'CNY'], [/^Asia\/Seoul$/, 'KRW'],
    [/^Asia\/Dubai$/, 'AED'], [/^Asia\/Riyadh$/, 'SAR'], [/^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus)$/, 'BRL'], [/^America\/(Mexico_City|Monterrey|Cancun|Tijuana)$/, 'MXN'],
    [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax)$/, 'CAD'], [/^Australia\//, 'AUD'], [/^Europe\/London$/, 'GBP'], [/^Europe\//, 'EUR']];
  let home = 'USD';
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; home = ZONES.find(([re]) => re.test(tz))?.[1] ?? 'USD'; } catch { /* keep dollars */ }

  const money = (amount, currency) => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount); }
    catch { return amount.toLocaleString(); }
  };
  const read = (text, cur) => { try { return window.CGReader ? window.CGReader.read(text, cur) : []; } catch { return []; } };
  const chips = (items, cur) => items.map((p) =>
    `<span class="chip${p.dir === 'in' ? ' in' : ''}"><i style="background:${esc(p.color)}"></i><b>${p.dir === 'in' ? '+' : '−'}${esc(money(p.amount, p.currency || cur))}</b><span>${esc(p.category)}</span></span>`).join('');

  /* ───────── The hero's reader: type a line, see what the app would file ───────── */
  const form = $('[data-reader]'), input = $('#reader-input'), out = $('[data-reader-out]'), note = $('[data-reader-note]');
  const NOTE = note?.textContent ?? '';
  const show = (text, cur = home, quiet = false) => {
    const items = read(text, cur);
    if (!out) return items;
    if (items.length) out.innerHTML = chips(items.slice(0, 4), cur);
    else if (!quiet) out.innerHTML = text.trim() ? '<span class="chip none">Add an amount, like “lunch 12”</span>' : '';
    return items;
  };

  // Until someone types, the box writes a line in one language after another.
  const own = home === 'NGN' ? 'bolt 6k, lunch 4.5k, got paid 350k' : home === 'INR' ? 'chai 20, auto 80, salary 45 hazaar' : 'lunch 12, bus 2.80, got paid 2,400';
  const LINES = [[own, home], ['taxi 80, me pagaron 15 mil', 'MXN'], ['午饭35，打车20，收到工资8000', 'CNY'], ["café 2,50 €, maman m'a envoyé 200", 'EUR'], ['점심 8000원, 월급 250만원', 'KRW'],
    ['غداء 45 درهم، الراتب 12 ألف', 'AED'], ['चाय 20, सैलरी 45 हज़ार', 'INR'], ['almoço 35, recebi 2500', 'BRL'], ['ランチ 850円、給料 25万円', 'JPY'], ['chakula 500, nimelipwa elfu 20', 'KES']];
  let demo = true, timer = 0;
  const stopDemo = () => { if (!demo) return; demo = false; clearTimeout(timer); input.value = ''; show(''); input.placeholder = own; };
  const write = (n = 0) => {
    if (!demo) return;
    const [line, cur] = LINES[n % LINES.length];
    const chars = [...line];
    let i = 0;
    const step = () => {
      if (!demo) return;
      i++;
      input.value = chars.slice(0, i).join('');
      show(input.value, cur, true);
      if (i < chars.length) timer = setTimeout(step, 46 + Math.random() * 44);
      else timer = setTimeout(() => write(n + 1), 2600);
    };
    step();
  };
  if (form && input) {
    input.addEventListener('focus', stopDemo);
    input.addEventListener('input', () => { demo = false; clearTimeout(timer); show(input.value); if (note) note.textContent = NOTE; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (demo) { stopDemo(); input.focus(); return; }
      const items = show(input.value);
      if (items.length && note) note.innerHTML = 'That is how it would be filed. <a href="app/">Open CashGlome</a> to keep it.';
      else input.focus();
    });
    const start = () => { if (calm) { input.value = own; show(own); demo = false; input.addEventListener('focus', () => { input.value = ''; show(''); }, { once: true }); } else write(); };
    if (window.CGReader) start(); else addEventListener('load', start, { once: true });
  }

  /* ───────── The wall: each line is read by the real reader, in place ───────── */
  const fill = () => $$('[data-line]').forEach((el) => {
    const line = el.dataset.line, cur = el.dataset.home || home;
    const hand = $('.hand', el), box = $('.chips', el);
    if (hand) hand.textContent = line;
    if (box) box.innerHTML = chips(read(line, cur), cur);
  });
  if (window.CGReader) fill(); else addEventListener('load', fill, { once: true });

  /* ───────── The varnish slider ───────── */
  $$('[data-restorer]').forEach((el) => {
    const range = $('input', el);
    const set = () => el.style.setProperty('--at', range.value + '%');
    range.addEventListener('input', set);
    set();
    // One slow pass the first time it is seen, so nobody has to guess that it moves
    if (!calm && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries, io) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const from = 18, to = 62, t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - p, 3);
          range.value = String(from + (to - from) * e); set();
          if (p < 1 && document.activeElement !== range) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { threshold: .55 }).observe(el);
    }
  });

  /* ───────── Small reveals ───────── */
  const rising = $$('[data-rise]');
  if ('IntersectionObserver' in window && !calm) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rising.forEach((el) => io.observe(el));
  } else rising.forEach((el) => el.classList.add('in'));
})();
