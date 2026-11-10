// The shared Muse: forwards CashGlome's Muse calls to Meta's Model API with the key kept on the server.
// The key lives only in the Vercel environment variable META_API_KEY; it is never sent to the browser.
// Someone who pastes their own key in the app sends it in the Authorization header, and it's used instead.
//
// Environment (Vercel → Project → Settings → Environment Variables):
//   META_API_KEY        required: the key every user shares
//   META_BASE           optional: OpenAI-compatible base URL (default https://api.meta.ai/v1)
//   MUSE_PER_MINUTE     optional: requests per minute per visitor (default 20)
//   MUSE_PER_DAY        optional: requests per day per visitor (default 300)
//   MUSE_ORIGINS        optional: extra allowed origins, comma-separated

const BASE = (process.env.META_BASE || 'https://api.meta.ai/v1').replace(/\/+$/, '');
const MODELS = new Set(['muse-spark-1.3', 'muse-spark-1.1', 'muse-wonder-1.0']);
const FIELDS = ['model', 'messages', 'tools', 'tool_choice', 'temperature', 'max_tokens', 'reasoning_effort', 'response_format'];
const MAX_TOKENS = 4000;
const MAX_BODY = 4_000_000; // receipts are sent as images; Vercel's own limit is 4.5 MB
const PER_MINUTE = Number(process.env.MUSE_PER_MINUTE) || 20;
const PER_DAY = Number(process.env.MUSE_PER_DAY) || 300;
const ORIGINS = [
  'https://cashglome.vercel.app',
  ...(process.env.MUSE_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
];
// The web app on this site, local development, and the desktop app (which runs from a file).
const allowed = (o) => !o || ORIGINS.includes(o) || o === 'null' || o === 'file://' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

// Per-visitor limits. Kept in memory, so each server instance counts on its own: a brake, not a wall.
// Set a monthly spending limit in Meta's console too.
const seen = new Map();
function overLimit(ip) {
  const now = Date.now();
  const v = seen.get(ip) || { minute: now, m: 0, day: now, d: 0 };
  if (now - v.minute > 60_000) { v.minute = now; v.m = 0; }
  if (now - v.day > 86_400_000) { v.day = now; v.d = 0; }
  v.m++; v.d++;
  seen.set(ip, v);
  if (seen.size > 5000) for (const [k, x] of seen) if (now - x.day > 86_400_000) seen.delete(k);
  return v.m > PER_MINUTE ? 'minute' : v.d > PER_DAY ? 'day' : null;
}

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && allowed(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'origin');
    res.setHeader('access-control-allow-headers', 'content-type, authorization, x-ai-base');
    res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
    res.setHeader('access-control-max-age', '86400');
  }
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!allowed(origin)) return send(res, 403, { error: 'Not allowed from this site' });

  const own = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const key = own.length > 8 ? own : process.env.META_API_KEY;
  if (!key) return send(res, 503, { error: "The shared Muse isn't set up on this server yet" });

  if (!own) {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const hit = overLimit(ip);
    if (hit) return send(res, 429, { error: hit === 'minute' ? 'Muse is busy, try again in a minute' : "You've used today's Muse allowance; CashGlome's own reader carries on" });
  }

  let input = req.body;
  try {
    if (typeof input === 'string') { if (input.length > MAX_BODY) return send(res, 413, { error: 'Too large' }); input = JSON.parse(input); }
    else if (JSON.stringify(input || {}).length > MAX_BODY) return send(res, 413, { error: 'Too large' });
  } catch { return send(res, 400, { error: 'Bad JSON' }); }
  if (!input || !Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > 80) return send(res, 400, { error: 'Bad request' });
  if (!own && !MODELS.has(input.model)) return send(res, 400, { error: 'Unknown model' });

  // Only the fields Chat Completions needs, with a ceiling on how long an answer can be.
  const body = {};
  for (const f of FIELDS) if (input[f] !== undefined) body[f] = input[f];
  body.max_tokens = Math.min(Number(body.max_tokens) || 1500, MAX_TOKENS);
  body.stream = false;

  try {
    const up = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
    });
    const text = await up.text();
    // Meta's error text can echo request details; send a short version back.
    if (!up.ok) return send(res, up.status, { error: `Muse error ${up.status}`, detail: text.slice(0, 300) });
    return send(res, 200, text);
  } catch (e) {
    return send(res, 502, { error: "Couldn't reach Muse", detail: String((e && e.message) || e).slice(0, 200) });
  }
};
