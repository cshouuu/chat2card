import { parsePublicShare, ShareParseError } from './parse-share.mjs';

const ALLOWED_ORIGINS = new Set([
  'https://cshouuu.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function corsHeaders(origin) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://cshouuu.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'chat2card-parser' }, 200, origin);
    }

    if (request.method !== 'POST' || url.pathname !== '/parse') {
      return json({ error: 'Not found.' }, 404, origin);
    }

    try {
      const body = await request.json();
      if (!body || typeof body.url !== 'string' || body.url.length > 4096) {
        return json({ error: 'A valid share URL is required.' }, 400, origin);
      }
      const result = await parsePublicShare(body.url.trim());
      return json(result, 200, origin);
    } catch (error) {
      if (error instanceof ShareParseError) {
        return json({ error: error.message }, error.status || 422, origin);
      }
      console.error(error);
      return json({ error: 'Failed to parse share link.' }, 500, origin);
    }
  },
};
