import { describe, it, expect } from 'vitest';
import { evaluateEvidence } from '../lib/aeo-evidence';
import { evaluateStatistics } from '../lib/aeo-statistics';
import { evaluateQuotations } from '../lib/aeo-quotations';
import { evaluateExtractability } from '../lib/aeo-extractability';
import { evaluateReadability } from '../lib/aeo-readability';

describe('AEO Evidence', () => {
  it('detects explicit sections', () => {
    expect(evaluateEvidence('Some text. ## References\n[1] ABC')).toBeGreaterThanOrEqual(2.0);
  });
  it('detects inline attributions', () => {
    expect(evaluateEvidence('According to [Google](url) this is true.')).toBeGreaterThanOrEqual(1.0);
  });
  it('returns 0 for text without attribution', () => {
    expect(evaluateEvidence('Just some random opinions.')).toBe(0.0);
  });
  it('caps at 3.0', () => {
    expect(evaluateEvidence('## References\n[1]\n[2]\n[3]\n[4]\n[5]')).toBe(3.0);
  });
});

describe('AEO Statistics', () => {
  it('detects percentages and currency', () => {
    expect(evaluateStatistics('Sales grew by 42% to $2.4 million.')).toBeGreaterThanOrEqual(1.5);
  });
  it('detects large counts', () => {
    expect(evaluateStatistics('We have 1,200 users.')).toBeGreaterThanOrEqual(1.0);
  });
  it('returns 0 for text without numbers', () => {
    expect(evaluateStatistics('Sales are growing.')).toBe(0.0);
  });
  it('caps at 2.5', () => {
    expect(evaluateStatistics('10% 20% 30% 40% 50%')).toBe(2.5);
  });
});

describe('AEO Quotations', () => {
  it('detects strong quotes', () => {
    expect(evaluateQuotations('According to Smith, "This is a very important finding that we must consider."')).toBeGreaterThanOrEqual(0.8);
  });
  it('returns 0 for text without quotes', () => {
    expect(evaluateQuotations('Smith said it is important.')).toBe(0.0);
  });
});

describe('AEO Extractability', () => {
  it('rewards answerability and structure for HTML', () => {
    const input = {
      text: 'This is a test. It provides features. And it also has a lot of other text so that it passes the length check. '.repeat(5),
      contentType: 'HTML_CONTENT' as const,
      htmlMetadata: { titlePresent: true, h1Count: 1, h2h3Count: 3, liCount: 5, tableCount: 1, pCount: 3, textLength: 600 }
    };
    expect(evaluateExtractability(input)).toBeGreaterThan(1.0); // should get points for structure and answers and lists/tables
  });

  it('rewards structure for Markdown', () => {
    const input = {
      text: '# Title\n\n## Section 1\n\n## Section 2\n\n## Section 3\n\n- item 1\n- item 2\n\n| Col 1 | Col 2 |\n|---|---|\n| A | B |\n\nIt provides features. And other text '.repeat(5),
      contentType: 'MARKDOWN_CONTENT' as const
    };
    expect(evaluateExtractability(input)).toBeGreaterThan(1.0);
  });

  it('penalizes short content', () => {
    const input = {
      text: 'Short',
      contentType: 'HTML_CONTENT' as const,
      htmlMetadata: { titlePresent: true, h1Count: 1, h2h3Count: 0, liCount: 0, tableCount: 0, pCount: 1, textLength: 5 }
    };
    expect(evaluateExtractability(input)).toBe(0.0);
  });
});

describe('AEO Readability', () => {
  it('scores readable text positively', () => {
    expect(evaluateReadability('The cat sat on the mat. It was a good cat.')).toBeGreaterThanOrEqual(0.5);
  });
  it('scores complex text lower', () => {
    expect(evaluateReadability('The juxtaposition of utilitarian architecture alongside avant-garde structural elements necessitates profound philosophical introspection.')).toBeLessThan(0.8);
  });
});
