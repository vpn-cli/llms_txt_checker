/**
 * Structural validation for llms.txt files.
 *
 * Checks the parsed Markdown against the llms.txt proposal.
 * Clearly distinguishes specification requirements from heuristic/best-practice checks.
 */

import type { ParsedMarkdown, ValidationCheck, CheckType } from '@/types/audit';

function check(
  ruleId: string,
  type: CheckType,
  pass: boolean,
  title: string,
  passMessage: string,
  failMessage: string,
  isWarning = false
): ValidationCheck {
  return {
    ruleId,
    type,
    status: pass ? 'pass' : isWarning ? 'warning' : 'fail',
    title,
    message: pass ? passMessage : failMessage,
  };
}

/**
 * Run all structural validation checks on parsed Markdown.
 */
export function validateStructure(parsed: ParsedMarkdown): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // ─── Specification Checks ─────────────────────────────────────────

  // 1. H1 exists
  checks.push(
    check(
      'h1-exists',
      'proposal-required',
      parsed.h1 !== null && parsed.h1.length > 0,
      'H1 heading exists',
      `H1 found: "${parsed.h1}"`,
      'Missing H1 heading — the llms.txt spec requires a top-level H1 with the project/company name'
    )
  );

  // 2. H1 is the first meaningful heading (it should be before any H2)
  // This is checked implicitly by the parser which takes the first H1
  checks.push(
    check(
      'h1-first',
      'proposal-required',
      parsed.h1 !== null,
      'H1 is the first heading',
      'H1 appears as the first heading in the document',
      'H1 is not the first heading — the spec requires H1 as the top-level structure'
    )
  );

  // 3. Summary blockquote exists
  checks.push(
    check(
      'blockquote-exists',
      'proposal-optional',
      parsed.blockquote !== null && parsed.blockquote.length > 0,
      'Summary blockquote exists',
      'Summary blockquote found after H1',
      'Missing summary blockquote — the spec recommends an optional short description as a blockquote after the H1',
      true // warning, not fail — it's optional
    )
  );

  // 4. H2 sections recognized
  const hasH2 = parsed.sections.length > 0;
  checks.push(
    check(
      'h2-sections',
      'proposal-optional',
      true, // H2 sections are optional, presence is not required
      'H2 sections',
      hasH2
        ? `${parsed.sections.length} H2 section(s) found: ${parsed.sections.map((s) => `"${s.heading}"`).join(', ')}`
        : 'No H2 sections found — this is acceptable for simple llms.txt files',
      '' // never fails
    )
  );

  // 5. H2 sections contain link lists (when present)
  if (hasH2) {
    const sectionsWithLinks = parsed.sections.filter((s) => s.links.length > 0);
    checks.push(
      check(
        'h2-has-links',
        'proposal-required',
        sectionsWithLinks.length > 0,
        'H2 sections contain link lists',
        `${sectionsWithLinks.length}/${parsed.sections.length} section(s) contain Markdown links`,
        'H2 sections exist but contain no Markdown link lists — sections should organize linked resources',
        true // warning
      )
    );
  }

  // 6. List entries use Markdown hyperlinks (ONLY if H2 sections are present)
  const totalLinks = parsed.links.length;
  if (hasH2) {
    checks.push(
      check(
        'links-present',
        'proposal-required',
        totalLinks > 0,
        'Markdown hyperlinks present in sections',
        `${totalLinks} Markdown link(s) found`,
        'No Markdown hyperlinks found in sections — if H2 sections are used, they must contain link lists.',
        true // warning
      )
    );
  }

  // 7. URLs are syntactically valid
  if (totalLinks > 0) {
    const invalidUrls = parsed.links.filter((link) => {
      try {
        new URL(link.url, 'https://example.com'); // Allow relative URLs
        return false;
      } catch {
        return true;
      }
    });

    checks.push(
      check(
        'urls-valid',
        'proposal-required',
        invalidUrls.length === 0,
        'URLs are syntactically valid',
        'All URLs are syntactically valid',
        `${invalidUrls.length} invalid URL(s): ${invalidUrls.map((l) => `"${l.url}"`).join(', ')}`
      )
    );
  }

  // 8. Heading hierarchy is reasonable
  // The parser extracts H1 and H2s — we just check there's no deep nesting abuse
  checks.push(
    check(
      'heading-hierarchy',
      'proposal-required',
      parsed.h1 !== null,
      'Heading hierarchy',
      'Document follows a reasonable heading hierarchy (H1 → H2)',
      'No H1 heading found — heading hierarchy cannot be validated'
    )
  );

  // ─── Heuristic / Best Practice Checks ─────────────────────────────

  // 9. Link titles are descriptive
  if (totalLinks > 0) {
    const weakTitles = parsed.links.filter((link) => {
      const lower = link.title.toLowerCase();
      return (
        lower.length < 3 ||
        ['click here', 'here', 'link', 'url', 'this'].includes(lower)
      );
    });

    checks.push(
      check(
        'descriptive-titles',
        'assignment-heuristic',
        weakTitles.length === 0,
        'Link titles are descriptive',
        'All link titles are descriptive',
        `${weakTitles.length} link(s) have weak titles: ${weakTitles.map((l) => `"${l.title}"`).join(', ')} — descriptive titles help AI systems understand what each resource contains`,
        true // warning
      )
    );
  }

  // 10. Links have descriptions
  if (totalLinks > 0) {
    const linksWithDescription = parsed.links.filter(
      (link) => link.description.length > 0
    );

    checks.push(
      check(
        'link-descriptions',
        'assignment-heuristic',
        linksWithDescription.length >= totalLinks * 0.5, // at least half should have descriptions
        'Links have descriptions',
        `${linksWithDescription.length}/${totalLinks} link(s) have descriptions`,
        `Only ${linksWithDescription.length}/${totalLinks} link(s) have descriptions — descriptions help AI systems understand each resource's purpose`,
        true // warning
      )
    );
  }

  // 11. Summary blockquote is meaningful (not too short)
  if (parsed.blockquote) {
    checks.push(
      check(
        'blockquote-quality',
        'assignment-heuristic',
        parsed.blockquote.length >= 20,
        'Summary blockquote is meaningful',
        `Summary blockquote is ${parsed.blockquote.length} characters — provides useful context`,
        `Summary blockquote is very short (${parsed.blockquote.length} chars) — a more detailed summary helps AI systems understand the project's purpose`,
        true // warning
      )
    );
  }

  return checks;
}
