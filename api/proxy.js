// api/proxy.js
// Vercel Edge Function — proxies requests to Anthropic, keeps key server-side

export const config = { runtime: 'edge' };

// Simple in-memory rate limiter (per IP, resets per cold start)
// For production, swap with Vercel KV or Upstash Redis
const hits = new Map();
const RATE_LIMIT   = 10;   // max requests per window per IP
const WINDOW_MS    = 60 * 60 * 1000; // 1 hour window

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    hits.set(ip, { count: 1, start: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  hits.set(ip, entry);
  return false;
}

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: { type: 'rate_limit', message: 'Too many requests. Please wait an hour and try again.' } }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { type: 'config', message: 'API key not configured on server.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Forward to Anthropic
  try {
    const body = await req.text();

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    const data = await upstream.text();

    return new Response(data, {
      status: upstream.status,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: { type: 'proxy_error', message: err.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
