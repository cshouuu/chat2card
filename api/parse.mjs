import { parsePublicShare, ShareParseError } from '../parser-service/parse-share.mjs';

const ALLOWED_ORIGINS = new Set([
  'https://cshouuu.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://cshouuu.github.io';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body.url !== 'string' || body.url.length > 4096) {
      return res.status(400).json({ error: 'A valid share URL is required.' });
    }
    const result = await parsePublicShare(body.url.trim());
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ShareParseError) {
      return res.status(error.status || 422).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Failed to parse share link.' });
  }
}
