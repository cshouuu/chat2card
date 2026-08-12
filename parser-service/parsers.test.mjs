import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeGeminiEnvelope,
  detectServerPlatform,
  parseChatGptHtml,
  parseClaudeMarkdown,
  parseDeepSeekShareJson,
  parseDoubaoShareJson,
  parseGeminiBatchExecute,
} from './parsers.mjs';

test('detectServerPlatform recognizes all supported share URLs', () => {
  assert.equal(detectServerPlatform('https://chatgpt.com/share/abc-123'), 'chatgpt');
  assert.equal(detectServerPlatform('https://chatgpt.com/s/abc_123'), 'chatgpt');
  assert.equal(detectServerPlatform('https://chat.openai.com/share/abc-123'), 'chatgpt');
  assert.equal(detectServerPlatform('https://gemini.google.com/share/abc123'), 'gemini');
  assert.equal(detectServerPlatform('https://share.gemini.google/abc123'), 'gemini');
  assert.equal(detectServerPlatform('https://g.co/gemini/share/abc123'), 'gemini');
  assert.equal(detectServerPlatform('https://chat.deepseek.com/share/abc123'), 'deepseek');
  assert.equal(detectServerPlatform('https://www.doubao.com/thread/xAbc123'), 'doubao');
  assert.equal(detectServerPlatform('https://claude.ai/share/5c870dee-553c-4133-b4ea-70d2c49063ff'), 'claude');
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
});

test('Gemini parser extracts image attachments from real public-share tuple shape', () => {
  const image = [null, 1, 'screenshot.png', 'https://lh3.googleusercontent.com/example', null, 'token', null, null, 1, [1, 2], null, 'image/png', null, null, null, [1569, 489, 91216]];
  const turn = [];
  turn[2] = [['Question with image', null, null, null, [[null, null, null, [image]]]]];
  turn[3] = [[[null, ['Answer']]]];

  const root = [];
  root[1] = [turn];
  root[2] = [null, 'Images'];
  const serializedPayload = JSON.stringify([root]);
  const envelope = [['wrb.fr', 'ujx1Bf', serializedPayload, null]];
  const body = `)]}'\n${JSON.stringify(envelope)}\n`;

  assert.deepEqual(decodeGeminiEnvelope(body), JSON.parse(serializedPayload));
  const parsed = parseGeminiBatchExecute(body);
  assert.equal(parsed.title, 'Images');
  assert.equal(parsed.messages.length, 2);
  assert.deepEqual(parsed.messages[0].attachments, [
    {
      type: 'image',
      name: 'screenshot.png',
      url: 'https://lh3.googleusercontent.com/example',
      mimeType: 'image/png',
      size: 91216,
      width: 1569,
      height: 489,
    },
  ]);
});

test('DeepSeek parser excludes thinking_content and keeps file metadata', () => {
  const parsed = parseDeepSeekShareJson({
    code: 0,
    data: {
      biz_code: 0,
      biz_data: {
        title: 'Shared Conversation',
        messages: [
          { role: 'USER', content: 'Review this file', files: [{ file_name: 'plan.pdf', file_size: 2048 }] },
          { role: 'ASSISTANT', content: 'Final answer only', thinking_content: 'SECRET REASONING', files: [] },
        ],
      },
    },
  });
  assert.equal(parsed.title, undefined);
  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.messages[1].content, 'Final answer only');
  assert.equal(JSON.stringify(parsed).includes('SECRET REASONING'), false);
  assert.deepEqual(parsed.messages[0].attachments, [
    { type: 'file', name: 'plan.pdf', mimeType: 'application/pdf', size: 2048 },
  ]);
});

test('Doubao parser uses structured user/assistant messages and ignores thinking_content', () => {
  const parsed = parseDoubaoShareJson({
    code: 0,
    data: {
      share_info: { share_name: 'Demo Doubao chat' },
      message_snapshot: {
        message_list: [
          {
            index_in_conv: '2',
            user_type: 2,
            thinking_content: 'SECRET DOUBAO THINKING',
            content_block: [
              { block_type: 10000, content: { text_block: { text: 'Final Doubao answer' } } },
              { block_type: 10001, content: { image_block: { url: 'https://example.com/generated.png', mime_type: 'image/png' } } },
            ],
          },
          {
            index_in_conv: '1',
            user_type: 1,
            content_block: [{ block_type: 10000, content: { text_block: { text: 'User prompt' } } }],
          },
        ],
      },
    },
  });
  assert.equal(parsed.title, 'Demo Doubao chat');
  assert.deepEqual(parsed.messages.map((m) => [m.role, m.content]), [
    ['user', 'User prompt'],
    ['assistant', 'Final Doubao answer'],
  ]);
  assert.equal(JSON.stringify(parsed).includes('SECRET DOUBAO THINKING'), false);
  assert.deepEqual(parsed.messages[1].attachments, [
    { type: 'image', url: 'https://example.com/generated.png', mimeType: 'image/png' },
  ]);
});

test('Claude parser strips UI metadata and represents hidden shared attachments', () => {
  const md = `Title: Claude\nURL Source: https://claude.ai/share/x\nMarkdown Content:\n## You said: review this\nreview this\nApr 15\n### Files hidden in shared chats\n\n## Claude responded: done\nViewed 2 files\nThe final review is ready.`;
  const parsed = parseClaudeMarkdown(md);
  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.messages[0].content, 'review this');
  assert.deepEqual(parsed.messages[0].attachments, [
    { type: 'file', name: '分享平台隐藏的附件', hidden: true },
  ]);
  assert.equal(parsed.messages[1].content, 'The final review is ready.');
});
