/**
 * 轻量 Markdown → HTML 渲染器。
 * 设计目标:无依赖、安全(先转义再渲染)、够用(代码块/标题/列表/引用/粗体/行内代码/链接)。
 * 覆盖的是聊天消息中最常见的 Markdown 子集,不追求完整规范。
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const INLINE_CODE = /`([^`\n]+)`/g;
const BOLD = /\*\*([^*\n]+)\*\*/g;
const ITALIC = /\*([^*\n]+)\*/g;
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** 渲染行内格式(输入必须是已转义文本) */
export function renderInline(escaped: string): string {
  // 行内代码优先处理并用占位符保护,避免其内容被后续 bold/italic/link 二次解析
  const codePlaceholders: string[] = [];
  let out = escaped.replace(INLINE_CODE, (_, code: string) => {
    const ph = `\u0000${codePlaceholders.length}\u0000`;
    codePlaceholders.push(code);
    return ph;
  });
  out = out.replace(LINK, (_, text: string, url: string) => {
    const href = escapeHtml(url);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  out = out.replace(BOLD, '<strong>$1</strong>');
  out = out.replace(ITALIC, '<em>$1</em>');
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${codePlaceholders[Number(i)]}</code>`);
  return out;
}

interface Block {
  type: 'code' | 'heading' | 'list' | 'quote' | 'para';
  text: string;
  lang?: string;
  level?: number;
}

function tokenizeBlocks(content: string): Block[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 代码块
    if (/^```/.test(trimmed)) {
      const lang = trimmed.replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 跳过结尾 ```
      blocks.push({ type: 'code', text: codeLines.join('\n'), lang: lang || undefined });
      continue;
    }

    // 标题
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', text: heading[2], level: heading[1].length });
      i++;
      continue;
    }

    // 引用块(连续 > 行合并)
    if (/^>+\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>+\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>+\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join('\n') });
      continue;
    }

    // 列表(连续列表项合并)
    if (/^[-*•]\s+/.test(trimmed) || /^\d+[.、)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (/^[-*•]\s+/.test(t)) {
          items.push(t.replace(/^[-*•]\s+/, ''));
          i++;
        } else if (/^\d+[.、)]\s+/.test(t)) {
          items.push(t.replace(/^\d+[.、)]\s+/, ''));
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', text: items.join('\n') });
      continue;
    }

    // 空行 → 段落分隔
    if (trimmed === '') {
      i++;
      continue;
    }

    // 普通段落:合并到下一个空行或特殊块之前
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^```/.test(lines[i].trim()) && !/^#{1,4}\s+/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'para', text: paraLines.join('\n') });
  }

  return blocks;
}

/** 将 Markdown 渲染为安全的 HTML 字符串 */
export function renderMarkdownToHtml(content: string): string {
  const blocks = tokenizeBlocks(content);
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'code': {
          const lang = b.lang ? ` class="lang-${escapeHtml(b.lang)}"` : '';
          return `<pre${lang}><code>${escapeHtml(b.text)}</code></pre>`;
        }
        case 'heading': {
          const tag = `h${Math.min(4, Math.max(1, b.level ?? 1))}`;
          return `<${tag}>${renderInline(escapeHtml(b.text))}</${tag}>`;
        }
        case 'quote':
          return `<blockquote>${renderInline(escapeHtml(b.text))}</blockquote>`;
        case 'list': {
          const items = b.text
            .split('\n')
            .map((it) => `<li>${renderInline(escapeHtml(it))}</li>`)
            .join('');
          return `<ul>${items}</ul>`;
        }
        case 'para':
          return `<p>${renderInline(escapeHtml(b.text))}</p>`;
        default:
          return '';
      }
    })
    .join('');
}
