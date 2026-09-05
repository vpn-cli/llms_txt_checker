import { describe, it, expect, vi } from 'vitest';
import { checkLinks } from '../lib/link-checker';
import * as fetcher from '../lib/fetcher';
import type { ParsedLink, FetchResult } from '../types/audit';

describe('link-checker', () => {
  it('identifies healthy links correctly', async () => {
    // Mock the fetcher to return a successful response
    vi.spyOn(fetcher, 'safeFetch').mockResolvedValue({
      url: 'https://example.com/docs',
      status: 200,
      contentType: 'text/html',
      finalUrl: null,
      body: '<html><head><title>Docs</title></head><body>This is the documentation content with enough text to be considered meaningful.</body></html>',
      size: 100,
      redirectCount: 0,
      error: null
    } as FetchResult);

    const links: ParsedLink[] = [
      { title: 'Docs', url: 'https://example.com/docs', description: '', section: 'Docs' }
    ];

    const results = await checkLinks(links);
    
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('HTML_CONTENT');
    expect(results[0].resolves).toBe(true);
    expect(results[0].isHtml).toBe(true);
    expect(results[0].isMarkdown).toBe(false);
    expect(results[0].hasMeaningfulContent).toBe(true);
  });

  it('identifies markdown links correctly', async () => {
    // Mock the fetcher to return a successful response
    vi.spyOn(fetcher, 'safeFetch').mockResolvedValue({
      url: 'https://example.com/docs.md',
      status: 200,
      contentType: 'text/markdown',
      finalUrl: null,
      body: '# This is Markdown',
      size: 100,
      redirectCount: 0,
      error: null
    } as FetchResult);

    const links: ParsedLink[] = [
      { title: 'Docs', url: 'https://example.com/docs.md', description: '', section: 'Docs' }
    ];

    const results = await checkLinks(links);
    
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('MARKDOWN_CONTENT');
    expect(results[0].resolves).toBe(true);
    expect(results[0].isHtml).toBe(false);
    expect(results[0].isMarkdown).toBe(true);
    expect(results[0].hasMeaningfulContent).toBe(true);
  });

  it('identifies empty HTML shells', async () => {
    vi.spyOn(fetcher, 'safeFetch').mockResolvedValue({
      url: 'https://example.com/empty',
      status: 200,
      contentType: 'text/html',
      finalUrl: null,
      body: '<html><body><script>app.mount()</script></body></html>',
      size: 50,
      redirectCount: 0,
      error: null
    } as FetchResult);

    const links: ParsedLink[] = [
      { title: 'Empty', url: 'https://example.com/empty', description: '', section: 'Docs' }
    ];

    const results = await checkLinks(links);
    
    expect(results[0].status).toBe('EMPTY_HTML');
    expect(results[0].resolves).toBe(true);
    expect(results[0].isHtml).toBe(true);
    expect(results[0].isMarkdown).toBe(false);
    expect(results[0].hasMeaningfulContent).toBe(false);
  });

  it('identifies other non-HTML targets', async () => {
    vi.spyOn(fetcher, 'safeFetch').mockResolvedValue({
      url: 'https://example.com/data.json',
      status: 200,
      contentType: 'application/json',
      finalUrl: null,
      body: '{"foo": "bar"}',
      size: 14,
      redirectCount: 0,
      error: null
    } as FetchResult);

    const links: ParsedLink[] = [
      { title: 'JSON', url: 'https://example.com/data.json', description: '', section: 'Docs' }
    ];

    const results = await checkLinks(links);
    
    expect(results[0].status).toBe('OTHER_NON_HTML');
    expect(results[0].resolves).toBe(true);
    expect(results[0].isHtml).toBe(false);
    expect(results[0].isMarkdown).toBe(false);
  });

  it('identifies broken targets', async () => {
    vi.spyOn(fetcher, 'safeFetch').mockResolvedValue({
      url: 'https://example.com/404',
      status: 404,
      contentType: 'text/html',
      finalUrl: null,
      body: 'Not Found',
      size: 9,
      redirectCount: 0,
      error: null
    } as FetchResult);

    const links: ParsedLink[] = [
      { title: 'Broken', url: 'https://example.com/404', description: '', section: 'Docs' }
    ];

    const results = await checkLinks(links);
    
    expect(results[0].status).toBe('BROKEN');
    expect(results[0].resolves).toBe(false);
  });
});
