import { describe, it, expect } from 'vitest';
import { calculateScore } from '../lib/scoring';
import type { FileAuditResult, LinkCheckResult } from '../types/audit';

describe('scoring engine', () => {
  it('calculates a perfect score for a perfect file', () => {
    const llmsTxt: FileAuditResult = {
      url: 'https://example.com/llms.txt',
      exists: true,
      httpStatus: 200,
      contentType: 'text/markdown',
      finalUrl: null,
      size: 1000,
      classification: { classification: 'REAL_MARKDOWN', confidence: 1, reasons: [] },
      parsed: null,
      checks: [
        { ruleId: 'h1-exists', type: 'proposal-required', status: 'pass', title: '', message: '' },
        { ruleId: 'blockquote-exists', type: 'proposal-optional', status: 'pass', title: '', message: '' }
      ],
      error: null
    };

    const llmsFullTxt: FileAuditResult = {
      url: 'https://example.com/llms-full.txt',
      exists: true,
      httpStatus: 200,
      contentType: 'text/markdown',
      finalUrl: null,
      size: 2000,
      classification: { classification: 'REAL_MARKDOWN', confidence: 1, reasons: [] },
      parsed: null,
      checks: [],
      error: null
    };

    const links: LinkCheckResult[] = [
      { 
        title: '', 
        url: '', 
        description: '', 
        section: '', 
        status: 'HTML_CONTENT', 
        httpStatus: 200, 
        finalUrl: null, 
        contentType: 'text/html', 
        resolves: true, 
        isHtml: true, 
        isMarkdown: false, 
        hasMeaningfulContent: true, 
        aeoScore: { evidence: 3.0, statistics: 2.5, quotations: 1.5, extractability: 2.0, readability: 1.0, total: 10.0 }, 
        error: null 
      }
    ];

    const result = calculateScore(llmsTxt, llmsFullTxt, links);
    
    // Authenticity = 30 + 5 (content type) + 5 (full txt) = 40
    // Structure = 25 (all spec checks pass)
    // Link Health = 25 (all links healthy)
    // Link Quality = 10 (no heuristic checks fail)
    // Total = 100
    
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.fixes.length).toBe(0); // Perfect score = no fixes
  });

  it('penalizes severely for soft 404 or SPA shell', () => {
    const llmsTxt: FileAuditResult = {
      url: 'https://example.com/llms.txt',
      exists: true,
      httpStatus: 200,
      contentType: 'text/html',
      finalUrl: null,
      size: 1000,
      classification: { classification: 'SPA_SHELL', confidence: 1, reasons: [] },
      parsed: null,
      checks: [],
      error: null
    };

    const result = calculateScore(llmsTxt, null, []);
    
    // Authenticity = 0
    expect(result.breakdown.authenticity).toBe(0);
    expect(result.fixes.some(f => f.ruleId === 'spa-shell')).toBe(true);
  });
});
