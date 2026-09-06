import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateLlmsTxt } from '../lib/generator';
import * as fetcher from '../lib/fetcher';

vi.mock('../lib/fetcher', () => ({
  safeFetch: vi.fn(),
}));

describe('generateLlmsTxt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should generate a valid draft from a sitemap, filtering low value URLs', async () => {
    const mockFetch = vi.mocked(fetcher.safeFetch);

    // 1. Mock robots.txt
    mockFetch.mockImplementationOnce(async (url) => {
      if (url.includes('robots.txt')) {
        return {
          url,
          status: 200,
          contentType: 'text/plain',
          finalUrl: null,
          body: 'Sitemap: https://example.com/sitemap.xml',
          size: 100,
          redirectCount: 0,
          error: null,
        };
      }
      return { url, status: 404, contentType: null, finalUrl: null, body: null, size: 0, redirectCount: 0, error: null };
    });

    // 2. Mock sitemap.xml
    mockFetch.mockImplementationOnce(async (url) => {
      return {
        url,
        status: 200,
        contentType: 'application/xml',
        finalUrl: null,
        body: `
          <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url><loc>https://example.com/</loc></url>
            <url><loc>https://example.com/about</loc></url>
            <url><loc>https://example.com/login</loc></url> <!-- Should be skipped -->
          </urlset>
        `,
        size: 100,
        redirectCount: 0,
        error: null,
      };
    });

    // 3. Mock page fetches
    mockFetch.mockImplementation(async (url) => {
      if (url === 'https://example.com/') {
        return {
          url, status: 200, contentType: 'text/html', finalUrl: null, size: 100, redirectCount: 0, error: null,
          body: '<html><head><title>Home Page</title><meta name="description" content="Welcome to the home page" /></head><body><h1>Main Home</h1></body></html>'
        };
      }
      if (url === 'https://example.com/about') {
        return {
          url, status: 200, contentType: 'text/html', finalUrl: null, size: 100, redirectCount: 0, error: null,
          body: '<html><head><title>About Us</title></head><body><h1>About Our Company</h1></body></html>'
        };
      }
      return { url, status: 404, contentType: null, finalUrl: null, body: null, size: 0, redirectCount: 0, error: null };
    });

    const result = await generateLlmsTxt('example.com', 'https://example.com');
    expect(result).not.toBeNull();
    expect(result).toContain('# example.com');
    expect(result).toContain('[Home Page](https://example.com/): Welcome to the home page');
    expect(result).toContain('[About Us](https://example.com/about): About Our Company');
    
    // Ensure login was filtered out
    expect(result).not.toContain('login');
  });

  it('should return null if no sitemaps are found and fallback fails', async () => {
    const mockFetch = vi.mocked(fetcher.safeFetch);
    mockFetch.mockResolvedValue({ url: '', status: 404, contentType: null, finalUrl: null, body: null, size: 0, redirectCount: 0, error: null });

    const result = await generateLlmsTxt('example.com', 'https://example.com');
    expect(result).toBeNull();
  });
});
