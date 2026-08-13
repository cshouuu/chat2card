import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseChatGptHtml } from './chatgptShareParser';
import { fetchChatGptHtmlViaJina, parseShareLink } from './linkParser';

function makeSingleTurnShareHtml(): string {
  const pool: unknown[] = [];
  pool[0] = { _1: 2, _3: 4 };
  pool[1] = 'messages';
  pool[2] = [5];
  pool[3] = 'title';
  pool[4] = 'Route title that should not win';
  pool[5] = { _6: 7, _8: 9 };
  pool[6] = 'author';
  pool[7] = { _10: 11 };
  pool[8] = 'content';
  pool[9] = { _12: 13 };
  pool[10] = 'role';
  pool[11] = 'assistant';
  pool[12] = 'parts';
  pool[13] = [14];
  pool[14] = 'This is the shared ChatGPT response.';

  const argument = JSON.stringify(JSON.stringify(pool));
  return `<html><head><title>ChatGPT - Shared task</title></head><body><script>window.__reactRouterContext.streamController.enqueue(${argument});</script></body></html>`;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('parseChatGptHtml', () => {
  it('parses /s/ flat messages and prefers the document title', () => {
    const parsed = parseChatGptHtml(makeSingleTurnShareHtml());
    expect(parsed.source).toBe('link');
    expect(parsed.title).toBe('Shared task');
    expect(parsed.messages).toEqual([
      { role: 'assistant', content: 'This is the shared ChatGPT response.' },
    ]);
  });
});

describe('ChatGPT Jina raw HTML fallback', () => {
  it('requests raw HTML with the required Jina curl-engine headers', async () => {
    const html = makeSingleTurnShareHtml();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchChatGptHtmlViaJina('https://chatgpt.com/s/example');
    expect(result).toContain('streamController.enqueue');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://r.jina.ai/https://chatgpt.com/s/example',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Engine': 'curl',
          'X-Respond-With': 'html',
          'X-Respond-Timing': 'html',
          'X-No-Cache': 'true',
        }),
      }),
    );
  });

  it('falls back to Jina raw HTML when the parser service rejects ChatGPT', async () => {
    const html = makeSingleTurnShareHtml();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const requestUrl = String(input);
      if (requestUrl.includes('/parse')) {
        return new Response(JSON.stringify({ error: 'ChatGPT share page returned HTTP 403.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(html, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const parsed = await parseShareLink('https://chatgpt.com/s/example');
    expect(parsed.title).toBe('Shared task');
    expect(parsed.messages).toEqual([
      { role: 'assistant', content: 'This is the shared ChatGPT response.' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://r.jina.ai/https://chatgpt.com/s/example',
      expect.any(Object),
    );
  });
});
