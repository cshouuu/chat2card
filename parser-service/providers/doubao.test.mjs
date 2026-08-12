import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDoubaoPayload } from './doubao.mjs';

test('parseDoubaoPayload keeps serialized USER text and structured assistant blocks', () => {
  const parsed = parseDoubaoPayload({
    code: 0,
    data: {
      share_info: { share_name: 'Demo' },
      message_snapshot: {
        message_list: [
          {
            index_in_conv: '26',
            user_type: 1,
            content: '{"text":"抖音"}',
            content_block: [],
          },
          {
            index_in_conv: '27',
            user_type: 2,
            thinking_content: 'DO NOT LEAK THIS REASONING',
            content_block: [
              { block_type: 10000, content: { text_block: { text: '最终回复' } } },
              { block_type: 10001, content: { image_block: { url: 'https://example.com/image.png', mime_type: 'image/png' } } },
            ],
          },
        ],
      },
    },
  });

  assert.equal(parsed.title, 'Demo');
  assert.deepEqual(parsed.messages.map((m) => [m.role, m.content]), [
    ['user', '抖音'],
    ['assistant', '最终回复'],
  ]);
  assert.equal(JSON.stringify(parsed).includes('DO NOT LEAK'), false);
  assert.deepEqual(parsed.messages[1].attachments, [
    { type: 'image', url: 'https://example.com/image.png', mimeType: 'image/png' },
  ]);
});
