import { runAudit } from '../lib/audit';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// Define the tests
const tests = [
  { id: '01-infrasity', domain: 'infrasity.com', type: 'production' },
  { id: '02-vercel', domain: 'vercel.com', type: 'production' },
  { id: '03-anthropic-docs', domain: 'docs.anthropic.com', type: 'production' },
  { id: '04-cloudflare', domain: 'developers.cloudflare.com', type: 'production' },
  { id: '05-stripe-docs', domain: 'docs.stripe.com', type: 'production' },
  { id: '06-supabase', domain: 'supabase.com', type: 'production' },
  { id: '07-missing-file', domain: 'fixture-missing.com', type: 'fixture' },
  { id: '08-misconfigured', domain: 'fixture-misconfigured.com', type: 'fixture' },
  { id: '09-soft-404', domain: 'fixture-soft-404.com', type: 'fixture' },
];

let currentFixtureMode = '';

const mockServer = http.createServer((req, res) => {
  console.log(`Mock server got request: ${req.method} ${req.url} (Mode: ${currentFixtureMode})`);
  if (currentFixtureMode === 'fixture-missing.com') {
    if (req.url === '/llms.txt' || req.url === '/llms-full.txt') {
      res.writeHead(404);
      res.end('Not Found');
    } else if (req.url === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Sitemap: http://fixture-missing.com/sitemap.xml`);
    } else if (req.url === '/sitemap.xml') {
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>http://fixture-missing.com/</loc></url>
          <url><loc>http://fixture-missing.com/about</loc></url>
        </urlset>
      `);
    } else if (req.url === '/' || req.url === '/about') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const title = req.url === '/' ? 'Home' : 'About Us';
      res.end(`<html><head><title>${title}</title><meta name="description" content="Description for ${title}"></head><body><h1>${title} Page</h1></body></html>`);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } else if (currentFixtureMode === 'fixture-misconfigured.com') {
    if (req.url === '/llms.txt' || req.url === '/llms-full.txt') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head><title>SPA</title></head><body><div id="root"></div><script src="app.js"></script></body></html>');
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } else if (currentFixtureMode === 'fixture-soft-404.com') {
    if (req.url === '/llms.txt' || req.url === '/llms-full.txt') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head><title>Page Not Found</title></head><body><h1>404 - Oops, we cannot find that page.</h1></body></html>');
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

async function runTestMatrix() {
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(process.cwd(), 'audit-results', `run-${timestampStr}`);
  fs.mkdirSync(outDir, { recursive: true });

  const summary = {
    runTimestamp: new Date().toISOString(),
    tests: [] as Record<string, unknown>[],
  };

  // Start mock server
  await new Promise<void>((resolve) => {
    mockServer.listen(0, '127.0.0.1', () => resolve());
  });
  const port = (mockServer.address() as import('net').AddressInfo).port;

  // Intercept fetch to bypass SSRF for fixtures
  const originalFetch = global.fetch;
  global.fetch = async (url: RequestInfo | URL, options?: RequestInit) => {
    let urlStr = url.toString();
    if (urlStr.includes('fixture-missing.com') || 
        urlStr.includes('fixture-misconfigured.com') || 
        urlStr.includes('fixture-soft-404.com')) {
      const originalHost = new URL(urlStr).host;
      urlStr = urlStr.replace(originalHost, `127.0.0.1:${port}`);
      // add host header to trick the mock server
      options = options || {};
      options.headers = (options.headers as Record<string, string>) || {};
      (options.headers as Record<string, string>)['Host'] = originalHost;
    }
    return originalFetch(urlStr, options);
  };

  console.log('LLMS.TXT AUDIT MATRIX');
  console.log('──────────────────────────────────────────────────────');
  console.log('Test                  Status          File State');
  console.log('──────────────────────────────────────────────────────');

  let passed = 0;
  let failed = 0;
  let networkErrors = 0;

  for (const test of tests) {
    const testDir = path.join(outDir, test.id);
    fs.mkdirSync(testDir, { recursive: true });

    let targetUrl = test.domain;
    if (test.type === 'fixture') {
      targetUrl = `http://${test.domain}`;
      currentFixtureMode = test.domain;
    }

    const reqData = {
      domain: test.domain,
      timestamp: new Date().toISOString(),
      endpoint: '/api/check',
    };
    fs.writeFileSync(path.join(testDir, 'request.json'), JSON.stringify(reqData, null, 2));

    let statusLabel = 'FAIL';
    let fileStateLabel = 'Unknown';

    const startTime = Date.now();
    try {
      const result = await runAudit(targetUrl);
      const durationMs = Date.now() - startTime;

      fileStateLabel = result.files.llmsTxt.fileStatus || 'Unknown';
      
      // Expected behavior check
      let expectedBehaviorMet = true;
      if (test.id === '07-missing-file') {
        if (fileStateLabel !== 'Not Found' || !result.files.llmsTxt.generatedDraft) expectedBehaviorMet = false;
      } else if (test.id === '08-misconfigured' || test.id === '09-soft-404') {
        if (fileStateLabel !== 'Misconfigured' || result.files.llmsTxt.generatedDraft) expectedBehaviorMet = false;
      } else {
        if (fileStateLabel !== 'Valid') expectedBehaviorMet = false;
      }

      statusLabel = expectedBehaviorMet ? 'PASS' : 'FAIL';
      if (expectedBehaviorMet) {
        passed++;
      } else {
        failed++;
      }

      const respData = {
        _testMetadata: {
          domain: reqData.domain,
          timestamp: new Date().toISOString(),
          durationMs,
          httpStatus: result.files.llmsTxt.httpStatus,
        },
        ...result,
      };

      fs.writeFileSync(path.join(testDir, 'response.json'), JSON.stringify(respData, null, 2));

      // Generate markdown response
      let md = `# Audit Result for ${reqData.domain}\n\n`;
      md += `- **Timestamp:** ${respData._testMetadata.timestamp}\n`;
      md += `- **HTTP Status:** ${respData._testMetadata.httpStatus}\n`;
      md += `- **Duration:** ${durationMs}ms\n`;
      md += `- **File Classification:** ${result.files.llmsTxt.classification.classification}\n`;
      md += `- **File Status:** ${fileStateLabel}\n`;
      md += `- **Technical Score:** ${result.score}\n`;
      
      let totalAeo = 0;
      for (const link of result.links) {
        if (link.aeoScore) totalAeo += link.aeoScore.total;
      }
      const avgAeo = result.links.length ? (totalAeo / result.links.length).toFixed(2) : '0';

      md += `- **AEO Score:** ${avgAeo}\n`;
      md += `- **Total Audited URLs:** ${result.summary.linkStats.auditedUrls}\n`;
      md += `- **Healthy Links:** ${result.summary.linkStats.healthy}\n`;
      md += `- **Broken Links:** ${result.summary.linkStats.broken}\n`;
      
      let htmlLinks = 0, markdownLinks = 0, otherLinks = 0, spaShells = 0;
      for (const link of result.links) {
        if (link.status === 'HTML_CONTENT') htmlLinks++;
        if (link.status === 'MARKDOWN_CONTENT') markdownLinks++;
        if (link.status === 'OTHER_NON_HTML') otherLinks++;
        if (link.status === 'SPA_SHELL') spaShells++;
      }
      
      md += `- **HTML Links:** ${htmlLinks}\n`;
      md += `- **Markdown Links:** ${markdownLinks}\n`;
      md += `- **Other Non-HTML:** ${otherLinks}\n`;
      md += `- **SPA Shells:** ${spaShells}\n`;
      
      md += `\n## Structure Findings\n`;
      for (const check of result.files.llmsTxt.checks) {
        md += `- [${check.status.toUpperCase()}] ${check.title}\n`;
      }

      md += `\n## Ranked Fixes\n`;
      for (const fix of result.fixes) {
        md += `- [${fix.severity.toUpperCase()}] ${fix.title} (Impact: ${fix.pointsImpact})\n`;
      }

      md += `\n## Generator Status\n`;
      md += `Draft present: ${result.files.llmsTxt.generatedDraft !== null}\n`;
      if (result.files.llmsTxt.generatedDraft) {
        md += `\n### Generated Draft\n\`\`\`markdown\n${result.files.llmsTxt.generatedDraft}\n\`\`\`\n`;
      }

      fs.writeFileSync(path.join(testDir, 'response.md'), md);

      summary.tests.push({
        id: test.id,
        domain: reqData.domain,
        environment: test.type,
        status: 'completed',
        httpStatus: result.files.llmsTxt.httpStatus,
        fileStatus: fileStateLabel,
        classification: result.files.llmsTxt.classification.classification,
        technicalScore: result.score,
        aeoScore: avgAeo,
        durationMs,
        responseFile: `${test.id}/response.json`,
      });
      
    } catch (err: unknown) {
      statusLabel = 'FAIL';
      const error = err as Error;
      const isNetworkError = error.message.includes('fetch') || error.message.includes('timeout') || error.message.includes('network');
      if (isNetworkError) {
        networkErrors++;
        statusLabel = 'NETWORK';
      } else {
        failed++;
      }
      
      const errorData = {
        testStatus: isNetworkError ? 'NETWORK_ERROR' : 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString(),
        domain: reqData.domain,
      };
      fs.writeFileSync(path.join(testDir, 'error.json'), JSON.stringify(errorData, null, 2));

      summary.tests.push({
        id: test.id,
        domain: reqData.domain,
        environment: test.type,
        status: isNetworkError ? 'NETWORK_ERROR' : 'ERROR',
        error: error.message,
      });
    }

    const testName = test.id.substring(3).padEnd(20, ' ').replace(/-/g, ' ');
    console.log(`${test.id.substring(0,2)} ${testName.padEnd(19)} ${statusLabel.padEnd(15)} ${fileStateLabel}`);
  }

  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log('──────────────────────────────────────────────────────');
  console.log('\nResults:');
  console.log(`${tests.length} tests executed`);
  console.log(`${passed} passed`);
  console.log(`${failed} failed`);
  console.log(`${networkErrors} network errors`);
  console.log(`\nResults saved to:\n${outDir}`);

  mockServer.close();
}

runTestMatrix().catch(console.error);
