import { describe, expect, it } from 'vitest';
import {
  assertNotBlocked,
  detectPlatform,
  isShareLink,
  parseClaudeMarkdown,
  parseDeepSeekJson,
  parseDoubaoMarkdown,
} from './linkParser';
import { ParseError } from './types';

const CLAUDE_FIXTURE = `Title: Claude

URL Source: https://claude.ai/share/xxx

Markdown Content:
Your first chat with Claude

## You said: 今天天气怎么样?

今天天气怎么样?
Apr 15

## Claude responded: 你好!

Searched the web, viewed a file
今天天气不错。

**建议**:
- 带伞
- 多喝水

## You said: 你觉得这个方案怎么样

### Files hidden in shared chats

你觉得这个方案怎么样

## Claude responded: 可以

Viewed 2 files
整体可以推进。
`;

const DOUBAO_FIXTURE = `Title: 如何提升学习效率? - 豆包

URL Source: https://www.doubao.com/thread/xxx

Markdown Content:
提升学习效率的核心是**专注**和**反馈**。

- 番茄工作法
- 主动回忆
- 间隔重复
`;

describe('detectPlatform / isShareLink', () => {
  it('识别五个平台真实 host', () => {
    expect(detectPlatform('https://claude.ai/share/abc')).toBe('claude');
    expect(detectPlatform('https://chat.deepseek.com/share/abc')).toBe('deepseek');
    expect(detectPlatform('https://www.doubao.com/thread/abc')).toBe('doubao');
    expect(detectPlatform('https://chatgpt.com/s/abc')).toBe('chatgpt');
    expect(detectPlatform('https://chatgpt.com/share/abc')).toBe('chatgpt');
    expect(detectPlatform('https://gemini.google.com/share/abc')).toBe('gemini');
    expect(detectPlatform('https://share.gemini.google/abc')).toBe('gemini');
  });

  it('非链接返回 null', () => {
    expect(detectPlatform('随便一段文字')).toBeNull();
    expect(detectPlatform('https://example.com/x')).toBe('unknown');
  });

  it('isShareLink', () => {
    expect(isShareLink('https://claude.ai/share/abc')).toBe(true);
    expect(isShareLink('用户: 你好')).toBe(false);
  });
});

describe('parseClaudeMarkdown', () => {
  it('清理 UI 元数据并保留隐藏附件占位', () => {
    const r = parseClaudeMarkdown(CLAUDE_FIXTURE);
    expect(r.source).toBe('link');
    expect(r.messages).toHaveLength(4);
    expect(r.messages[0]).toMatchObject({ role: 'user', content: '今天天气怎么样?' });
    expect(r.messages[1].content).toContain('今天天气不错');
    expect(r.messages[1].content).not.toContain('Searched the web');
    expect(r.messages[2].attachments).toEqual([
      { type: 'file', name: '分享平台隐藏的附件', hidden: true },
    ]);
    expect(r.messages[3]).toMatchObject({ role: 'assistant', content: '整体可以推进。' });
  });

  it('无消息抛错', () => {
    expect(() => parseClaudeMarkdown('Markdown Content:\nSome random text')).toThrow(ParseError);
  });
});

describe('parseDeepSeekJson', () => {
  it('只解析最终回答，不解析 thinking_content，并保留文件', () => {
    const r = parseDeepSeekJson({
      data: {
        biz_data: {
          title: 'Shared Conversation',
          messages: [
            { role: 'USER', content: '分析附件', files: [{ file_name: 'demo.pdf', file_size: 1024 }] },
            { role: 'ASSISTANT', content: '这是最终回答', thinking_content: '这里是不能出现在卡片里的思考过程', files: [] },
          ],
        },
      },
    });
    expect(r.messages).toHaveLength(2);
    expect(r.messages[1].content).toBe('这是最终回答');
    expect(JSON.stringify(r)).not.toContain('思考过程');
    expect(r.messages[0].attachments).toEqual([{ type: 'file', name: 'demo.pdf', size: 1024 }]);
  });
});

describe('parseDoubaoMarkdown fallback', () => {
  it('基础页面保底解析', () => {
    const r = parseDoubaoMarkdown(DOUBAO_FIXTURE);
    expect(r.title).toBe('如何提升学习效率?');
    expect(r.messages[1].content).toContain('番茄工作法');
  });

  it('备用页面出现 Thought 时拒绝使用，避免泄露思考过程', () => {
    expect(() => parseDoubaoMarkdown('Title: x - 豆包\nMarkdown Content:\nThought for 3 seconds\nsecret')).toThrow(ParseError);
  });
});

describe('assertNotBlocked', () => {
  it('检测登录墙', () => {
    expect(() => assertNotBlocked('Markdown Content:\nGet responses tailored to you\nLog in to get answers')).toThrow(ParseError);
  });

  it('检测反爬页', () => {
    expect(() => assertNotBlocked('Markdown Content:\nCheck your internet connection and try again')).toThrow(ParseError);
  });

  it('正常内容不抛错', () => {
    const normal = [
      'Markdown Content:',
      'Your first chat with Claude',
      '## You said: 今天天气怎么样?',
      '帮我看看今天的天气,顺便问一下明天会下雨吗?',
      '## Claude responded: 你好!',
      '今天天气不错,建议带伞出门。明天预计多云,大概率不会下雨,',
      '不过建议出门前再看一眼天气预报,这样更稳妥一些。',
    ].join('\n');
    expect(() => assertNotBlocked(normal)).not.toThrow();
  });
});
