import { describe, it, expect } from 'vitest';
import { validateStructure } from '../lib/validator';
import type { ParsedMarkdown } from '../types/audit';

describe('validator', () => {
  it('validates a perfect markdown structure', () => {
    const parsed: ParsedMarkdown = {
      h1: 'My Project',
      blockquote: 'This is a sufficiently long description of the project.',
      sections: [
        {
          heading: 'Docs',
          level: 2,
          content: '',
          links: [
            { title: 'Good Title', url: 'https://example.com', description: 'Has description', section: 'Docs' }
          ]
        }
      ],
      links: [
        { title: 'Good Title', url: 'https://example.com', description: 'Has description', section: 'Docs' }
      ],
      raw: ''
    };

    const checks = validateStructure(parsed);
    const failed = checks.filter(c => c.status === 'fail');
    const warnings = checks.filter(c => c.status === 'warning');

    expect(failed.length).toBe(0);
    expect(warnings.length).toBe(0);
  });

  it('fails when H1 is missing', () => {
    const parsed: ParsedMarkdown = {
      h1: null,
      blockquote: null,
      sections: [],
      links: [],
      raw: ''
    };

    const checks = validateStructure(parsed);
    const h1Exists = checks.find(c => c.ruleId === 'h1-exists');
    
    expect(h1Exists?.status).toBe('fail');
  });

  it('allows missing blockquote and zero links if no H2 sections exist', () => {
    const parsed: ParsedMarkdown = {
      h1: 'Project',
      blockquote: null,
      sections: [],
      links: [],
      raw: ''
    };

    const checks = validateStructure(parsed);
    const blockquoteCheck = checks.find(c => c.ruleId === 'blockquote-exists');
    const linksCheck = checks.find(c => c.ruleId === 'links-present');

    // Blockquote exists check should be a warning but NOT a failure.
    expect(blockquoteCheck?.status).toBe('warning');
    // Links present should not even be checked if there are no H2s, or it passes
    expect(linksCheck).toBeUndefined(); 
  });

  it('warns when an H2 section exists but contains no links (malformed file list)', () => {
    const parsed: ParsedMarkdown = {
      h1: 'Project',
      blockquote: null,
      sections: [{ heading: 'Docs', level: 2, content: 'Some text but no links here.', links: [] }],
      links: [],
      raw: ''
    };

    const checks = validateStructure(parsed);
    const h2HasLinksCheck = checks.find(c => c.ruleId === 'h2-has-links');
    const linksPresentCheck = checks.find(c => c.ruleId === 'links-present');

    expect(h2HasLinksCheck?.status).toBe('warning');
    expect(linksPresentCheck?.status).toBe('warning');
  });

  it('warns on weak link titles and missing descriptions', () => {
    const parsed: ParsedMarkdown = {
      h1: 'Project',
      blockquote: 'Good blockquote length for the heuristic.',
      sections: [{ heading: 'Docs', level: 2, content: '', links: [{ title: 'Here', url: 'https://example.com', description: '', section: 'Docs' }] }],
      links: [{ title: 'Here', url: 'https://example.com', description: '', section: 'Docs' }],
      raw: ''
    };

    const checks = validateStructure(parsed);
    const titleCheck = checks.find(c => c.ruleId === 'descriptive-titles');
    const descCheck = checks.find(c => c.ruleId === 'link-descriptions');

    expect(titleCheck?.status).toBe('warning');
    expect(descCheck?.status).toBe('warning');
  });
});
