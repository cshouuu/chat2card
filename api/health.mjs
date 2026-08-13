export default function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://cshouuu.github.io');
  res.status(200).json({ ok: true, service: 'chat2card-parser' });
}
