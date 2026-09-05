import { describe, it, expect } from 'vitest';
import { detectSoft404 } from '../lib/soft404';

describe('soft404 detector', () => {
  it('detects a soft 404 from title and body text', () => {
    const html = `
      <html>
        <head><title>Page Not Found</title></head>
        <body>
          <h1>404</h1>
          <p>The page you are looking for does not exist.</p>
        </body>
      </html>
    `;
    const result = detectSoft404(html, 'text/html', 200);
    expect(result.detected).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('does not detect soft 404 for a normal page', () => {
    const html = `
      <html>
        <head><title>My Project Documentation</title></head>
        <body>
          <h1>Welcome to My Project</h1>
          <p>Here is how you use it.</p>
        </body>
      </html>
    `;
    const result = detectSoft404(html, 'text/html', 200);
    expect(result.detected).toBe(false);
  });

  it('ignores non-200 or non-HTML responses', () => {
    const html = '<html><head><title>404 Not Found</title></head><body></body></html>';
    
    const result1 = detectSoft404(html, 'text/html', 404);
    expect(result1.detected).toBe(false);

    const result2 = detectSoft404(html, 'application/json', 200);
    expect(result2.detected).toBe(false);
  });
});
