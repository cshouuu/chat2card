import http from 'node:http';
import { parsePublicShare, ShareParseError } from './parsers.mjs';

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024) throw new ShareParseError('Request body is too large.', 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new ShareParseError('Request body must be valid JSON.', 400);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/parse') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  try {
    const body = await readJson(req);
    if (typeof body.url !== 'string' || !body.url.trim()) {
      throw new ShareParseError('url is required.', 400);
    }
    const parsed = await parsePublicShare(body.url.trim());
    sendJson(res, 200, parsed);
  } catch (error) {
    const status = error instanceof ShareParseError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unknown parser error';
    sendJson(res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`chat2card parser service listening on http://localhost:${PORT}`);
});
