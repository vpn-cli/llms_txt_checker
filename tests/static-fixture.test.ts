import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseMarkdown } from '../lib/markdown-parser';
import { validateStructure } from '../lib/validator';

describe('static-fixture', () => {
  it('validates infrasity_llms.txt correctly', () => {
    const filePath = path.join(__dirname, '../infrasity_llms.txt');
    const content = fs.readFileSync(filePath, 'utf-8');

    const parsed = parseMarkdown(content);
    
    expect(parsed.h1).toBeTruthy();
    expect(parsed.h1).toBe('Infrasity');
    expect(parsed.blockquote).toBeTruthy();
    expect(parsed.sections.length).toBeGreaterThan(0);
    expect(parsed.links.length).toBeGreaterThan(0);

    const checks = validateStructure(parsed);
    const failed = checks.filter(c => c.status === 'fail');
    
    // The structure should be perfectly valid according to proposal-required rules.
    expect(failed.length).toBe(0);
    
    const h1Check = checks.find(c => c.ruleId === 'h1-exists');
    expect(h1Check?.status).toBe('pass');

    const linksPresentCheck = checks.find(c => c.ruleId === 'links-present');
    expect(linksPresentCheck?.status).toBe('pass');
  });
});
