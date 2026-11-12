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
  const sum = (p, cur) => `<small>${p.dir === 'in' ? '+' : '−'}</small>${esc(money(p.amount, p.currency || cur))}`;
  // One line of the account book: the writer's own word, where it was filed, the sum.
  // When the word and the category are the same ("Salary"), it is only said once.
  const filed = (p) => (String(p.label || '').toLowerCase() === String(p.category).toLowerCase() ? '' : `<i style="background:${esc(p.color)}"></i>${esc(p.category)}`);
  const row = (p, cur) =>
    `<span class="row${p.dir === 'in' ? ' in' : ''}" data-k="${esc(p.dir + '|' + p.category)}"><span class="row-w" dir="auto">${esc(p.label || p.category)}</span><span class="row-c">${filed(p)}</span><span class="row-dots"></span><b>${sum(p, cur)}</b></span>`;
  const rows = (items, cur) => items.map((p) => row(p, cur)).join('');
  // Update the lines in place: a line that is still the same entry keeps its element and only its
  // words and sum change, so typing never replays the entrance or makes the page flicker.
  const paint = (box, items, cur) => {
    [...box.children].forEach((el) => { if (!el.dataset.k) el.remove(); });
    const have = [...box.children];
    items.forEach((p, i) => {
      const k = p.dir + '|' + p.category, el = have[i];
      if (el && el.dataset.k === k) {
        const b = el.querySelector('b'), w = el.querySelector('.row-w'), c = el.querySelector('.row-c'), html = sum(p, cur), word = p.label || p.category, cat = filed(p);
        if (b.innerHTML !== html) b.innerHTML = html;
        if (w.textContent !== word) w.textContent = word;
        if (c.innerHTML !== cat) c.innerHTML = cat;
      } else { const tmp = document.createElement('div'); tmp.innerHTML = row(p, cur); el ? el.replaceWith(tmp.firstChild) : box.append(tmp.firstChild); }
    });
    have.slice(items.length).forEach((el) => el.remove());
  };

  /* ───────── The painting: every entry wipes a patch of old varnish away ───────── */
  // Each patch is one swab rubbed back and forth; the mask it draws lets the clean painting through.
  const wipes = $('[data-wipes]');
  const SPOTS = [[330, 150, 250, 150], [840, 540, 240, 150], [150, 290, 220, 140], [470, 300, 220, 130], [130, 110, 200, 130], [690, 630, 250, 130], [890, 120, 180, 150],
    [520, 430, 230, 130], [470, 80, 200, 110], [780, 430, 200, 110], [560, 570, 200, 130], [300, 480, 230, 150], [110, 520, 190, 160], [330, 650, 260, 120]];
  let wiped = 0;
  const wipe = () => {
    if (!wipes || wiped >= SPOTS.length) return;
    const [cx, cy, w, h] = SPOTS[wiped++];
    const passes = 5, tilt = (wiped % 2 ? 1 : -1) * 10;
    let d = '';
    for (let i = 0; i <= passes; i++) {
      const x = i % 2 ? cx + w / 2 : cx - w / 2, y = cy - h / 2 + (h * i) / passes + (i % 2 ? tilt : -tilt);
      d += `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)} `;
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke-width', String(Math.round(h / 2.4)));
    wipes.append(path);
    if (calm) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len} ${len}`;
    path.style.strokeDashoffset = String(len);
    path.getBoundingClientRect();
    path.style.strokeDashoffset = '0';
  };

  /* ───────── The hero's page: write a line, see how the app would file it ───────── */
  const form = $('[data-reader]'), input = $('#reader-input'), out = $('[data-reader-out]'), note = $('[data-reader-note]'), langs = $('[data-langs]'), today = $('[data-today]');
  const DAYS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth',
    'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth', 'thirtieth', 'thirty-first'];
  if (today) { const d = new Date(); today.textContent = `${d.toLocaleDateString('en', { weekday: 'long' })}, the ${DAYS[d.getDate() - 1]} of ${d.toLocaleDateString('en', { month: 'long' })}`; }

  const COUNT = ['', 'One entry', 'Two entries', 'Three entries', 'Four entries'];
  const INVITE = 'Go on, write a line of your own.';
  let most = 0; // how many entries the line on the page has already shown, so each one wipes only once
  const fit = () => { if (!input) return; input.style.height = ''; input.style.height = Math.max(68, input.scrollHeight) + 'px'; };
  const show = (text, cur = home, quiet = false) => {
    const items = read(text, cur).slice(0, 4);
    if (!out) return items;
    if (items.length) paint(out, items, cur);
    else if (!quiet) out.innerHTML = text.trim() ? '<span class="row none">Add an amount, like “lunch 12”.</span>' : '';
    if (!items.length) most = 0;
    for (; most < items.length; most++) wipe();
    fit();
    return items;
  };
  // Between lines the last entries lift away, so the page never shows one language's sums under another's words
  const fade = () => { most = 0; [...(out?.children ?? [])].forEach((el) => { el.classList.add('leaving'); el.removeAttribute('data-k'); setTimeout(() => el.remove(), 230); }); };

  // Until someone writes, the page writes a line in one language after another.
  const own = home === 'NGN' ? 'bolt 6k, lunch 4.5k, got paid 350k' : home === 'INR' ? 'chai 20, auto 80, salary 45 hazaar' : 'lunch 12, bus 2.80, got paid 2,400';
  const LINES = [['English', 'en', own, home], ['Español', 'es', 'taxi 80, me pagaron 15 mil', 'MXN'], ['中文', 'zh', '午饭35，打车20，收到工资8000', 'CNY'], ['Français', 'fr', "café 2,50 €, maman m'a envoyé 200", 'EUR'],
    ['한국어', 'ko', '점심 8000원, 월급 250만원', 'KRW'], ['العربية', 'ar', 'غداء 45 درهم، الراتب 12 ألف', 'AED'], ['हिन्दी', 'hi', 'चाय 20, सैलरी 45 हज़ार', 'INR'], ['Português', 'pt', 'almoço 35, recebi 2500', 'BRL'],
    ['日本語', 'ja', 'ランチ 850円、給料 25万円', 'JPY'], ['Kiswahili', 'sw', 'chakula 500, nimelipwa elfu 20', 'KES']];
  let demo = true, timer = 0, cur = home;
  const tabs = [];
  const mark = (n) => tabs.forEach((b, i) => b.setAttribute('aria-pressed', String(i === n)));
  const say = (html) => { if (note && note.innerHTML !== html) note.innerHTML = html; };
  const stopDemo = () => { if (!demo) return; demo = false; clearTimeout(timer); cur = home; input.value = ''; input.lang = ''; show(''); input.placeholder = own; mark(-1); say(INVITE); };
  // Write one line a letter at a time; with `loop` it moves on to the next language afterwards.
  const write = (n = 0, loop = true) => {
    clearTimeout(timer);
    const [, lang, line, money] = LINES[n % LINES.length];
    const chars = [...line];
    let i = 0;
    cur = money; input.lang = lang; mark(n % LINES.length); fade(); say(INVITE);
    if (calm) { input.value = line; setTimeout(() => show(line, money), 240); return; }
    const step = () => {
      i++;
      input.value = chars.slice(0, i).join('');
      show(input.value, money, true);
      if (i < chars.length) timer = setTimeout(step, 46 + Math.random() * 44);
      else if (loop && demo) timer = setTimeout(() => write(n + 1), 2800);
    };
    step();
  };
  if (form && input) {
    if (langs) {
      LINES.forEach(([name, lang], n) => {
        const b = document.createElement('button');
        b.type = 'button'; b.lang = lang; b.textContent = name; b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => { demo = false; write(n, false); });
        langs.append(b); tabs.push(b);
      });
      langs.hidden = false;
    }
    input.addEventListener('focus', stopDemo);
    input.addEventListener('input', () => {
      demo = false; clearTimeout(timer); mark(-1);
      const items = show(input.value, cur);
      say(items.length ? `${COUNT[items.length]}, from one line. <a href="app/">Open CashGlome</a> to keep ${items.length > 1 ? 'them' : 'it'}.` : INVITE);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); input.blur(); } });
    form.addEventListener('submit', (e) => e.preventDefault());
    addEventListener('resize', fit, { passive: true });
    const start = () => { if (calm) { demo = false; write(0, false); } else write(); };
    if (window.CGReader) start(); else addEventListener('load', start, { once: true });
  }

  /* ───────── The wall: each line is read by the real reader, in place ───────── */
  const fill = () => $$('[data-line]').forEach((el) => {
    const line = el.dataset.line, cur = el.dataset.home || home;
    const hand = $('.hand', el), box = $('.ledger', el);
    if (hand) hand.textContent = line;
    if (box) box.innerHTML = rows(read(line, cur), cur);
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
