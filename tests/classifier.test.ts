import { describe, it, expect } from 'vitest';
import { classifyResponse } from '../lib/classifier';
import type { FetchResult, DetectionResult } from '../types/audit';

function mockFetch(overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    url: 'https://example.com/llms.txt',
    status: 200,
    contentType: 'text/markdown',
    finalUrl: 'https://example.com/llms.txt',
    body: '# Title\n\n> Summary\n\n## Section\n- [Link](https://example.com)',
    size: 100,
    redirectCount: 0,
    error: null,
    ...overrides,
  };
}

function mockDetection(detected = false, confidence = 0): DetectionResult {
  return { detected, confidence, reasons: [] };
}

describe('classifyResponse', () => {
  it('identifies genuine Markdown', () => {
    const fetchRes = mockFetch();
    const result = classifyResponse(fetchRes, mockDetection(), mockDetection());
    expect(result.classification).toBe('REAL_MARKDOWN');
  });

  it('identifies normal 404', () => {
    const fetchRes = mockFetch({ status: 404, contentType: 'text/html', body: 'Not found' });
    const result = classifyResponse(fetchRes, mockDetection(), mockDetection());
    expect(result.classification).toBe('NOT_FOUND');
  });

  it('identifies soft 404', () => {
    const fetchRes = mockFetch({ status: 200, contentType: 'text/html', body: '<html><title>Not Found</title></html>' });
    const result = classifyResponse(fetchRes, mockDetection(true, 0.9), mockDetection());
    expect(result.classification).toBe('SOFT_404');
  });

  it('identifies SPA shell', () => {
    const fetchRes = mockFetch({ status: 200, contentType: 'text/html', body: '<html><div id="app"></div></html>' });
    const result = classifyResponse(fetchRes, mockDetection(), mockDetection(true, 0.8));
    expect(result.classification).toBe('SPA_SHELL');
  });

  it('identifies genuine HTML page (not SPA, not Soft 404)', () => {
    const fetchRes = mockFetch({
      status: 200,
      contentType: 'text/html',
      body: '<html><head><title>Documentation</title></head><body><h1>Welcome to Docs</h1><p>Lots of good reading here.</p></body></html>',
    });
    // The key is that soft404 and spaShell detections return false
    const result = classifyResponse(fetchRes, mockDetection(false), mockDetection(false));
    expect(result.classification).toBe('HTML_PAGE');
  });

  it('identifies TOO_LARGE responses', () => {
    const fetchRes = mockFetch({
      status: 200,
      error: 'Response too large: 10000000 bytes'
    });
    const result = classifyResponse(fetchRes, mockDetection(), mockDetection());
    expect(result.classification).toBe('TOO_LARGE');
  });
});
