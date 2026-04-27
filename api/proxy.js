// api/proxy.js
// Vercel Serverless Function (Node.js) — 60s timeout on Hobby plan

export const config = { maxDuration: 60 };

const hits = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS  = 60 * 60 * 1000;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = hits.get(ip) || { count: 0, start: now };
    if (now - entry.start > WINDOW_MS) { hits.set(ip, { count: 1, start: now }); return false; }
    if (entry.count >= RATE_LIMIT) return true;
    entry.count++;
    hits.set(ip, entry);
    return false;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (isRateLimited(ip)) {
          return res.status(429).json({ error: { type: 'rate_limit', message: 'Too many requests. Please wait an hour and try again.' } });
    }

  const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: { type: 'config', message: 'API key not configured on server.' } });

  try {
        const body = JSON.stringify(req.body);

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
              body,
      });

      const data = await upstream.json();
        return res.status(upstream.status).json(data);
  } catch (err) {
        return res.status(500).json({ error: { type: 'proxy_error', message: err.message } });
  }
}
