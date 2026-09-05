import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../lib/markdown-parser';

describe('markdown-parser', () => {
  it('extracts h1, blockquote, sections, and links correctly', () => {
    const markdown = `
# My LLM Project

> This is a project summary.
> It spans multiple lines.

## Documentation

- [Getting Started](https://example.com/start): Learn how to begin.
- [API](https://example.com/api) - API reference.

## Optional

Some random text.
    `.trim();

    const result = parseMarkdown(markdown);

    expect(result.h1).toBe('My LLM Project');
    expect(result.blockquote).toBe('This is a project summary.\nIt spans multiple lines.');
    expect(result.sections.length).toBe(2);
    expect(result.sections[0].heading).toBe('Documentation');
    
    expect(result.links.length).toBe(2);
    
    expect(result.links[0]).toEqual({
      title: 'Getting Started',
      url: 'https://example.com/start',
      description: 'Learn how to begin.',
      section: 'Documentation'
    });

    expect(result.links[1]).toEqual({
      title: 'API',
      url: 'https://example.com/api',
      description: 'API reference.',
      section: 'Documentation'
    });
  });

  it('handles empty or non-standard markdown gracefully', () => {
    const result = parseMarkdown('Just some text');
    expect(result.h1).toBeNull();
    expect(result.blockquote).toBeNull();
    expect(result.sections.length).toBe(0);
    expect(result.links.length).toBe(0);
  });
});
