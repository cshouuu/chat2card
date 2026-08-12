import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeGeminiEnvelope,
  detectServerPlatform,
  parseChatGptHtml,
  parseGeminiBatchExecute,
} from './parsers.mjs';

test('detectServerPlatform recognizes supported ChatGPT and Gemini share URLs', () => {
  assert.equal(detectServerPlatform('https://chatgpt.com/share/abc-123'), 'chatgpt');
  assert.equal(detectServerPlatform('https://chatgpt.com/s/abc_123'), 'chatgpt');
  assert.equal(detectServerPlatform('https://chat.openai.com/share/abc-123'), 'chatgpt');
  assert.equal(detectServerPlatform('https://gemini.google.com/share/abc123'), 'gemini');
  assert.equal(detectServerPlatform('https://share.gemini.google/abc123'), 'gemini');
  assert.equal(detectServerPlatform('https://g.co/gemini/share/abc123'), 'gemini');
  assert.equal(detectServerPlatform('https://example.com/share/abc123'), 'unknown');
});

test('parseChatGptHtml hydrates turbo-stream messages', () => {
  const pool = [];
  pool[0] = { _1: 2, _3: 4 };
  pool[1] = 'messages';
  pool[2] = [5, 6];
  pool[3] = 'title';
  pool[4] = 'Demo conversation';
  pool[5] = { _7: 8, _9: 10 };
  pool[6] = { _7: 11, _9: 13 };
  pool[7] = 'author';
  pool[8] = { _12: 14 };
  pool[9] = 'content';
  pool[10] = { _15: 16 };
  pool[11] = { _12: 17 };
  pool[12] = 'role';
  pool[13] = { _15: 18 };
  pool[14] = 'user';
  pool[15] = 'parts';
  pool[16] = [19];
  pool[17] = 'assistant';
  pool[18] = [20];
  pool[19] = 'Hello';
  pool[20] = 'Hi there';

  const argument = JSON.stringify(JSON.stringify(pool));
  const html = `<script>window.__reactRouterContext.streamController.enqueue(${argument});</script>`;
  const parsed = parseChatGptHtml(html);
  assert.equal(parsed.title, 'Demo conversation');
  assert.deepEqual(parsed.messages, [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
  ]);
  assert.equal(parsed.source, 'link');
});

test('decodeGeminiEnvelope and parseGeminiBatchExecute extract turns', () => {
  const turn = [];
  turn[2] = [['What is an agent?']];
  turn[3] = [[[null, ['An agent can act toward a goal.']]]];

  const root = [];
  root[1] = [turn];
  root[2] = [null, 'Agents'];
  const payload = [root];
  const serializedPayload = JSON.stringify(payload);
  const normalizedPayload = JSON.parse(serializedPayload);
  const envelope = [['wrb.fr', 'ujx1Bf', serializedPayload, null]];
  const body = `)]}'\n${JSON.stringify(envelope)}\n`;

  assert.deepEqual(decodeGeminiEnvelope(body), normalizedPayload);
  const parsed = parseGeminiBatchExecute(body);
  assert.equal(parsed.title, 'Agents');
  assert.deepEqual(parsed.messages, [
    { role: 'user', content: 'What is an agent?' },
    { role: 'assistant', content: 'An agent can act toward a goal.' },
  ]);
  assert.equal(parsed.source, 'link');
});
