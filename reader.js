/* A small version of CashGlome's reader, for the hero. It uses the app's own category words
   (assets/categories.js) and runs entirely in the browser: nothing typed here is sent anywhere. */
(function () {
  const CATS = window.CG_CATEGORIES || [];
  const byId = Object.fromEntries(CATS.map((c) => [c.id, c]));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matchers = [];
  for (const c of CATS) for (const w of c.words) matchers.push({ id: c.id, dir: c.dir, len: w.length, re: new RegExp('(^|[^a-z])' + esc(w.toLowerCase()) + '(?=[^a-z]|$)') });
  matchers.sort((a, b) => b.len - a.len);

  const SYMBOLS = { '$': 'USD', '£': 'GBP', '€': 'EUR', '₦': 'NGN', '¥': 'JPY', '₹': 'INR', '₵': 'GHS' };
  const WORDS = { naira: 'NGN', ngn: 'NGN', usd: 'USD', dollar: 'USD', dollars: 'USD', gbp: 'GBP', pound: 'GBP', pounds: 'GBP', quid: 'GBP', eur: 'EUR', euro: 'EUR', euros: 'EUR', kes: 'KES', ksh: 'KES', shillings: 'KES', ghs: 'GHS', cedi: 'GHS', cedis: 'GHS', zar: 'ZAR', rand: 'ZAR', inr: 'INR', rupees: 'INR', jpy: 'JPY', yen: 'JPY', cad: 'CAD', aud: 'AUD' };
  const NAIJA = /\b(danfo|keke|okada|suya|jollof|amala|garri|nepa|phcn|owambe|shoprite|jumia|bet9ja|sportybet|piggyvest|cowrywise|abeg|wahala)\b/i;

  function localCurrency() {
    const l = navigator.language || 'en-US';
    const region = (l.split('-')[1] || '').toUpperCase();
    const map = { NG: 'NGN', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR', IN: 'INR', JP: 'JPY', CA: 'CAD', AU: 'AUD', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR' };
    return map[region] || (/^(de|fr|es|it|nl|fi)\b/i.test(l) ? 'EUR' : 'USD');
  }

  // "4.5k", "2,400", "₦350k", "1.2m", "15.49"
  const AMOUNT = /([$£€₦¥₹₵])?\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s?(k|m|bn)?(?![a-z])/i;
  const SPLIT = /\s*(?:,(?!\d{3}(?!\d))|;|\n|\s&\s|\band\b|\bthen\b|\bplus\b)\s*/i;
  const INCOME = /\b(got paid|paid me|payday|received|earned|sent me|gave me|refund(?:ed)?|won|sold)\b|\b(mum|mom|mother|dad|father|bro|brother|sis|sister|aunt|aunty|uncle|friend|boss|client)\s+(sent|gave|paid)\b/i;
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const FILLER = /\b(i|spent|spend|paid|pay|bought|buy|got|for|on|at|the|a|an|my|to|some|of|yesterday|today|last|this|morning|evening|night)\b/gi;

  function isQuestion(t) { return /\?\s*$/.test(t) || /^(how|what|which|when|why|did|do|am|was|where|who)\b/i.test(t.trim()); }

  function readOne(piece, fallbackCurrency) {
    const m = piece.match(AMOUNT);
    if (!m) return null;
    let amount = parseFloat(m[2].replace(/,/g, '') + (m[3] ? '.' + m[3] : ''));
    const unit = (m[4] || '').toLowerCase();
    if (unit === 'k') amount *= 1e3; else if (unit === 'm') amount *= 1e6; else if (unit === 'bn') amount *= 1e9;
    if (!amount) return null;
    const lower = ' ' + piece.toLowerCase() + ' ';
    let currency = m[1] ? SYMBOLS[m[1]] : null;
    if (!currency) for (const [w, code] of Object.entries(WORDS)) if (new RegExp('\\b' + w + '\\b').test(lower)) { currency = code; break; }
    currency = currency || fallbackCurrency;

    const income = INCOME.test(lower);
    let cat = null;
    for (const mt of matchers) if ((mt.dir === 'in') === income && mt.re.test(lower)) { cat = byId[mt.id]; break; }
    if (!cat && income) cat = /got paid|paid me|payday/.test(lower) ? byId.salary : /sent|gave/.test(lower) ? byId.blessing : byId.windfall;
    if (!cat) cat = byId.other;

    let when = '';
    if (/\byesterday\b/.test(lower)) when = 'Yesterday';
    else { const d = DAYS.find((x) => lower.includes(x)); if (d) when = d[0].toUpperCase() + d.slice(1); }

    let label = piece.replace(m[0], ' ').replace(FILLER, ' ').replace(/[^\p{L}\p{N}'’&\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!label) label = cat.short;
    label = label[0].toUpperCase() + label.slice(1);
    return { amount, currency, dir: income ? 'in' : 'out', save: cat.id === 'savings', cat, label, when };
  }

  function parse(text) {
    const t = (text || '').trim();
    if (!t) return { entries: [] };
    if (isQuestion(t)) return { entries: [], question: true };
    let fallback = localCurrency();
    if (NAIJA.test(t)) fallback = 'NGN';
    const explicit = t.match(/[$£€₦¥₹₵]/);
    if (explicit) fallback = SYMBOLS[explicit[0]];
    const entries = t.split(SPLIT).map((p) => p && readOne(p, fallback)).filter(Boolean).slice(0, 6);
    return { entries };
  }

  function money(e) {
    const whole = Math.abs(e.amount % 1) < 1e-9;
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', { style: 'currency', currency: e.currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(e.amount);
    } catch (_) { return e.currency + ' ' + e.amount.toLocaleString(); }
  }

  function chipsHTML(result) {
    if (result.question) return '<span class="chip hint">Questions go to Ask in the app. Here, write what you spent.</span>';
    if (!result.entries.length) return '';
    return result.entries.map((e) => {
      const sign = e.save ? '' : e.dir === 'in' ? '+' : '−';
      const note = e.when ? ` <small>· ${e.when}</small>` : '';
      return `<span class="chip${e.dir === 'in' ? ' in' : ''}" title="${e.label.replace(/"/g, '&quot;')}"><i style="background:${e.cat.color}"></i><b>${sign}${money(e)}</b>${e.cat.short}${note}</span>`;
    }).join('');
  }

  window.CGReader = { parse, chipsHTML };
})();
