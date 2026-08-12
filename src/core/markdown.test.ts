import { describe, expect, it } from 'vitest';
import { renderInline, renderMarkdownToHtml } from './markdown';

describe('renderInline', () => {
  it('转义后的粗体', () => {
    expect(renderInline('**加粗** 文本')).toContain('<strong>加粗</strong>');
  });

  it('行内代码优先于粗体', () => {
    expect(renderInline('`**不是粗体**`')).toBe('<code>**不是粗体**</code>');
  });

  it('斜体', () => {
    expect(renderInline('*斜体*')).toBe('<em>斜体</em>');
  });

  it('链接', () => {
    expect(renderInline('[OpenAI](https://openai.com)')).toBe(
      '<a href="https://openai.com" target="_blank" rel="noopener noreferrer">OpenAI</a>',
    );
  });
});

describe('renderMarkdownToHtml', () => {
  it('代码块', () => {
    const html = renderMarkdownToHtml('```python\nprint("hi")\n```');
    expect(html).toContain('<pre class="lang-python"><code>');
    expect(html).toContain('print(&quot;hi&quot;)');
  });

  it('标题带层级', () => {
    expect(renderMarkdownToHtml('# 标题一')).toContain('<h1>标题一</h1>');
    expect(renderMarkdownToHtml('### 标题三')).toContain('<h3>标题三</h3>');
  });

  it('列表', () => {
    const html = renderMarkdownToHtml('- 一\n- 二');
    expect(html).toContain('<ul><li>一</li><li>二</li></ul>');
  });

  it('引用', () => {
    expect(renderMarkdownToHtml('> 引用内容')).toContain('<blockquote>引用内容</blockquote>');
  });

  it('段落', () => {
    expect(renderMarkdownToHtml('普通段落')).toContain('<p>普通段落</p>');
  });

  it('XSS 转义', () => {
    const html = renderMarkdownToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
