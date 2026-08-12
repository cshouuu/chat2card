import { describe, expect, it } from 'vitest';
import { matchRolePrefix, parseChat, parseChatGptJson, parsePlainText, ParseError } from './parser';
import { ParsedChat } from './types';

describe('matchRolePrefix', () => {
  it('识别中文前缀', () => {
    expect(matchRolePrefix('用户: 你好')?.role).toBe('user');
    expect(matchRolePrefix('ChatGPT: 你好')?.role).toBe('assistant');
    expect(matchRolePrefix('系统: 设置')?.role).toBe('system');
  });

  it('识别英文前缀(大小写不敏感)', () => {
    expect(matchRolePrefix('user: hi')?.role).toBe('user');
    expect(matchRolePrefix('Assistant: hello')?.role).toBe('assistant');
    expect(matchRolePrefix('AI: hi')?.role).toBe('assistant');
  });

  it('识别 Markdown 加粗前缀', () => {
    expect(matchRolePrefix('**用户**: 你好')?.role).toBe('user');
    expect(matchRolePrefix('**ChatGPT**: 你好')?.role).toBe('assistant');
  });

  it('无前缀返回 null', () => {
    expect(matchRolePrefix('普通的一行文字')).toBeNull();
  });
});

describe('parsePlainText', () => {
  it('解析多轮对话', () => {
    const r = parsePlainText('用户: 你好\nChatGPT: 你好!有什么可以帮你?\n用户: 帮我写个排序\nChatGPT: 好的');
    expect(r.messages).toHaveLength(4);
    expect(r.messages[0]).toMatchObject({ role: 'user', content: '你好' });
    expect(r.messages[1]).toMatchObject({ role: 'assistant', content: '你好!有什么可以帮你?' });
  });

  it('支持多行消息内容', () => {
    const r = parsePlainText('用户: 第一行\n第二行\nChatGPT: 回复');
    expect(r.messages[0].content).toBe('第一行\n第二行');
  });

  it('空输入报错', () => {
    expect(() => parsePlainText('   ')).toThrow(ParseError);
  });

  it('无前缀内容报错', () => {
    expect(() => parsePlainText('没有前缀的一行')).toThrow(ParseError);
  });
});

describe('parseChatGptJson', () => {
  const conversation = {
    title: '测试对话',
    mapping: {
      root: { message: null, parent: null, children: ['a'] },
      a: {
        message: {
          author: { role: 'user' },
          content: { content_type: 'text', parts: ['你好'] },
          create_time: 1700000000,
        },
        parent: 'root',
        children: ['b'],
      },
      b: {
        message: {
          author: { role: 'assistant' },
          content: { content_type: 'text', parts: ['你好!', '有什么可以帮你?'] },
          create_time: 1700000001,
        },
        parent: 'a',
        children: [],
      },
    },
  };

  it('解析单个 conversation 对象', () => {
    const r = parseChatGptJson(JSON.stringify(conversation));
    expect(r.title).toBe('测试对话');
    expect(r.source).toBe('chatgpt-json');
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0]).toMatchObject({ role: 'user', content: '你好' });
    // parts 数组拼接
    expect(r.messages[1].content).toBe('你好!\n有什么可以帮你?');
    // 时间戳转换
    expect(r.messages[1].timestamp).toBeDefined();
  });

  it('解析 conversation 数组', () => {
    const r = parseChatGptJson(JSON.stringify([conversation]));
    expect(r.messages).toHaveLength(2);
  });

  it('解析新版导出(conversations 字段)', () => {
    const r = parseChatGptJson(JSON.stringify({ conversations: [conversation] }));
    expect(r.messages).toHaveLength(2);
  });

  it('非法 JSON 报错', () => {
    expect(() => parseChatGptJson('{oops')).toThrow(ParseError);
  });

  it('缺少 mapping 报错', () => {
    expect(() => parseChatGptJson(JSON.stringify([{ foo: 1 }]))).toThrow(ParseError);
  });
});

describe('parseChat 自动检测', () => {
  it('JSON 走 ChatGPT 解析', () => {
    const input = JSON.stringify({
      mapping: {
        root: { children: ['a'] },
        a: {
          message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['hi'] } },
          parent: 'root',
          children: [],
        },
      },
    });
    const r = parseChat(input) as ParsedChat;
    expect(r.source).toBe('chatgpt-json');
  });

  it('纯文本走 plaintext 解析', () => {
    const r = parseChat('用户: 在吗\nChatGPT: 在');
    expect(r.source).toBe('plaintext');
  });

  it('空输入报错', () => {
    expect(() => parseChat('')).toThrow(ParseError);
  });
});
