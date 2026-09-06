import { describe, it, expect } from 'vitest';
import { calculateScore } from '../lib/scoring';
import type { FileAuditResult, LinkCheckResult } from '../types/audit';

describe('scoring engine', () => {
  it('calculates a perfect score for a perfect file', () => {
    const llmsTxt: FileAuditResult = {
      url: 'https://example.com/llms.txt',
      exists: true,
      fileStatus: 'Valid',
      generatedDraft: null,
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
      fileStatus: 'Valid',
      generatedDraft: null,
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
    
    // Authenticity = 35 + 5 (content type) = 40
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
      fileStatus: 'Valid',
      generatedDraft: null,
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

  it('does not penalize missing llms-full.txt and excludes it from ranked fixes', () => {
    const llmsTxt: FileAuditResult = {
      url: 'https://example.com/llms.txt',
      exists: true,
      fileStatus: 'Valid',
      generatedDraft: null,
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

    // Note: llmsFullTxt is passed as null
    const result = calculateScore(llmsTxt, null, links);
    
    // Score should still be 100 since llms-full.txt missing is not penalized
    expect(result.score).toBe(100);
    // There should be no fix for llms-full.txt
    expect(result.fixes.some(f => f.ruleId === 'llms-full-txt')).toBe(false);
  });

  it('generates an informational redirect fix without docking points', () => {
    const llmsTxt: FileAuditResult = {
      url: 'https://example.com/llms.txt',
      exists: true,
      fileStatus: 'Valid',
      generatedDraft: null,
      httpStatus: 200,
      contentType: 'text/markdown',
      finalUrl: 'https://www.example.com/llms.txt', // Final URL is different (redirected)
      size: 1000,
      classification: { classification: 'REAL_MARKDOWN', confidence: 1, reasons: [] },
      parsed: null,
      checks: [
        { ruleId: 'h1-exists', type: 'proposal-required', status: 'pass', title: '', message: '' },
        { ruleId: 'blockquote-exists', type: 'proposal-optional', status: 'pass', title: '', message: '' }
      ],
      error: null
    };

    const result = calculateScore(llmsTxt, null, []);
    
    // Authenticity score remains unaffected by redirect (40 points)
    expect(result.breakdown.authenticity).toBe(40);
    
    const redirectFix = result.fixes.find(f => f.ruleId === 'llms-txt-redirect');
    expect(redirectFix).toBeDefined();
    expect(redirectFix!.pointsImpact).toBe(0);
    expect(redirectFix!.severity).toBe('low');
  });
});
