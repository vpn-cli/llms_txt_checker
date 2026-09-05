import { describe, it, expect } from 'vitest';
import { detectSpaShell } from '../lib/spa-detector';
import type { FetchResult } from '../types/audit';

describe('SPA shell detector', () => {
  it('detects SPA shell when responses are identical', () => {
    const html = `
      <html>
        <head><title>My App</title></head>
        <body><div id="root"></div><script src="app.js"></script></body>
      </html>
    `;
    const probeHtml = html; // exact same response
    
    const probeResult: FetchResult = {
      url: 'https://example.com/probe',
      status: 200,
      contentType: 'text/html',
      finalUrl: null,
      body: probeHtml,
      size: probeHtml.length,
      redirectCount: 0,
      error: null
    };

    const result = detectSpaShell(html, 'text/html', probeResult);
    expect(result.detected).toBe(true);
    // Should have multiple reasons (similarity, title, etc)
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('does not detect SPA shell for distinct responses', () => {
    const html = '<html><body><h1>Real llms.txt as HTML</h1><p>This is a much longer body text to ensure that the SPA shell detector does not incorrectly trigger the minimal body text heuristic. It needs to be over 100 characters in length to be considered a normal page and not an empty SPA shell.</p></body></html>';
    const probeHtml = '<html><body><h1>404 Not Found</h1></body></html>';
    
    const probeResult: FetchResult = {
      url: 'https://example.com/probe',
      status: 404,
      contentType: 'text/html',
      finalUrl: null,
      body: probeHtml,
      size: probeHtml.length,
      redirectCount: 0,
      error: null
    };

    const result = detectSpaShell(html, 'text/html', probeResult);
    expect(result.detected).toBe(false);
  });
});
