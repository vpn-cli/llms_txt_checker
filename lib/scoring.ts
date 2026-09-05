/**
 * Scoring engine — transparent score out of 100 with breakdown.
 *
 * Categories:
 *   Authenticity & availability: 40 points
 *   Structure:                   25 points
 *   Linked URL health:           25 points
 *   Link quality:                10 points
 */

import type {
  FileAuditResult,
  LinkCheckResult,
  ScoreBreakdown,
  Fix,
  Severity,
  ValidationCheck,
} from '@/types/audit';

// ─── Score Category Weights ──────────────────────────────────────────
const AUTHENTICITY_MAX = 40;
const STRUCTURE_MAX = 25;
const LINK_RESOLUTION_MAX = 25;
const LINK_QUALITY_MAX = 10;

/**
 * Calculate the authenticity & availability score.
 */
function scoreAuthenticity(llmsTxt: FileAuditResult, llmsFullTxt: FileAuditResult | null): number {
  let score = 0;

  // /llms.txt exists and is real Markdown: 30 points
  if (llmsTxt.classification.classification === 'REAL_MARKDOWN') {
    score += 30;
  } else if (llmsTxt.classification.classification === 'SOFT_404') {
    score += 0; // Major penalty
  } else if (llmsTxt.classification.classification === 'SPA_SHELL') {
    score += 0; // Major penalty
  } else if (llmsTxt.classification.classification === 'HTML_PAGE') {
    score += 5;
  } else if (llmsTxt.classification.classification === 'NOT_FOUND') {
    score += 0;
  }

  // Content type is correct (text/plain or text/markdown): 5 points
  if (llmsTxt.contentType) {
    if (
      llmsTxt.contentType.includes('text/plain') ||
      llmsTxt.contentType.includes('text/markdown')
    ) {
      score += 5;
    } else if (llmsTxt.contentType.includes('text/html')) {
      score += 0;
    }
  }

  // /llms-full.txt exists: 5 bonus points
  if (llmsFullTxt && llmsFullTxt.classification.classification === 'REAL_MARKDOWN') {
    score += 5;
  }

  return Math.min(score, AUTHENTICITY_MAX);
}

/**
 * Calculate the structural validation score.
 */
function scoreStructure(checks: ValidationCheck[]): number {
  if (checks.length === 0) return 0;

  // Weight checks by importance
  const weights: Record<string, number> = {
    'h1-exists': 6,
    'h1-first': 3,
    'blockquote-exists': 4,
    'h2-sections': 3,
    'h2-has-links': 3,
    'links-present': 3,
    'urls-valid': 2,
    'heading-hierarchy': 1,
  };

  let earned = 0;
  let total = 0;

  for (const c of checks) {
    if (c.type !== 'proposal-required') continue;
    const weight = weights[c.ruleId] || 1;
    total += weight;
    if (c.status === 'pass') earned += weight;
    else if (c.status === 'warning') earned += weight * 0.5;
  }

  if (total === 0) return STRUCTURE_MAX;
  return Math.round((earned / total) * STRUCTURE_MAX);
}

/**
 * Calculate the linked URL resolution & crawlability score.
 */
function scoreLinkResolution(links: LinkCheckResult[]): number {
  if (links.length === 0) return LINK_RESOLUTION_MAX; // No links to check

  let score = 0;
  for (const link of links) {
    switch (link.status) {
      case 'HTML_CONTENT':
      case 'MARKDOWN_CONTENT':
        score += 1; // Both resolve and have meaningful/readable content
        break;
      case 'OTHER_NON_HTML':
        score += 0.7; // Resolves, but not natively readable text
        break;
      case 'EMPTY_HTML':
        score += 0.3; // Resolves, but meaningless
        break;
      case 'BROKEN':
      case 'SERVER_ERROR':
      case 'SPA_SHELL':
        score += 0;
        break;
    }
  }

  return Math.round((score / links.length) * LINK_RESOLUTION_MAX);
}

/**
 * Calculate the AI/link quality score (heuristic).
 * Averages the AeoScore for all links that have one.
 */
function scoreLinkQuality(links: LinkCheckResult[]): number {
  const scorableLinks = links.filter((l) => l.aeoScore != null);
  if (scorableLinks.length === 0) return 0; // If there are links but none are scorable, it's 0. Wait, if total links is 0, return max.

  if (links.length === 0) return LINK_QUALITY_MAX;

  let totalAeoScore = 0;
  for (const link of scorableLinks) {
    totalAeoScore += link.aeoScore!.total;
  }

  // Calculate average out of 10
  const avg = totalAeoScore / scorableLinks.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Convert score to letter grade.
 */
function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Generate ranked fixes from failed/warning checks and link results.
 */
function generateFixes(
  llmsTxt: FileAuditResult,
  llmsFullTxt: FileAuditResult | null,
  checks: ValidationCheck[],
  links: LinkCheckResult[]
): Fix[] {
  const fixes: Fix[] = [];

  // File-level fixes
  const classification = llmsTxt.classification.classification;

  if (classification === 'NOT_FOUND') {
    fixes.push({
      ruleId: 'file-missing',
      severity: 'critical',
      title: '/llms.txt does not exist',
      explanation:
        'No /llms.txt file was found. Without this file, AI systems cannot discover or index your documentation and resources. This is the most fundamental requirement.',
      recommendation:
        'Create a /llms.txt file at the root of your domain with your project name, summary, and links to key documentation.',
      pointsImpact: 30,
    });
  }

  if (classification === 'SOFT_404') {
    fixes.push({
      ruleId: 'soft-404',
      severity: 'critical',
      title: '/llms.txt returns a soft-404',
      explanation:
        'The server returns HTTP 200 but the content is a "page not found" template. AI crawlers see this as a valid response but cannot extract useful information. This is worse than a real 404 because it silently fails.',
      recommendation:
        'Configure your web server to serve a real Markdown file at /llms.txt, or return a proper 404 status if the file does not exist.',
      pointsImpact: 30,
    });
  }

  if (classification === 'SPA_SHELL') {
    fixes.push({
      ruleId: 'spa-shell',
      severity: 'critical',
      title: '/llms.txt returns an SPA shell',
      explanation:
        'The server returns the same HTML application shell for /llms.txt as it does for any other path. AI crawlers cannot execute JavaScript — they see an empty HTML page instead of your documentation.',
      recommendation:
        'Configure your web server or CDN to serve a static Markdown file at /llms.txt, bypassing your SPA\'s catch-all routing.',
      pointsImpact: 30,
    });
  }

  if (classification === 'HTML_PAGE') {
    fixes.push({
      ruleId: 'html-instead-of-markdown',
      severity: 'high',
      title: '/llms.txt returns HTML instead of Markdown',
      explanation:
        'The server returns an HTML page at /llms.txt instead of a Markdown/text file. While some AI systems can parse HTML, the llms.txt spec expects a plain text or Markdown file.',
      recommendation:
        'Serve /llms.txt as a plain text or Markdown file with content-type text/plain or text/markdown.',
      pointsImpact: 20,
    });
  }

  // Structural fixes
  for (const c of checks) {
    if (c.status === 'pass') continue;
    
    // Ignore legacy heuristic checks from structural fixes as AEO replaces them
    if (['descriptive-titles', 'link-descriptions', 'blockquote-quality'].includes(c.ruleId)) {
      continue;
    }

    let severity: Severity = 'low';
    let pointsImpact = 2;

    if (c.ruleId === 'h1-exists') {
      severity = 'high';
      pointsImpact = 6;
    } else if (c.ruleId === 'blockquote-exists') {
      severity = 'medium';
      pointsImpact = 4;
    } else if (c.ruleId === 'urls-valid') {
      severity = 'high';
      pointsImpact = 5;
    } else if (c.ruleId === 'links-present') {
      severity = 'medium';
      pointsImpact = 3;
    }

    fixes.push({
      ruleId: c.ruleId,
      severity,
      title: c.title,
      explanation: c.message,
      recommendation: getRecommendation(c.ruleId),
      pointsImpact,
    });
  }

  // Link health fixes
  const brokenLinks = links.filter(
    (l) => l.status === 'BROKEN' || l.status === 'SERVER_ERROR'
  );
  if (brokenLinks.length > 0) {
    fixes.push({
      ruleId: 'broken-links',
      severity: brokenLinks.length >= 3 ? 'high' : 'medium',
      title: `${brokenLinks.length} linked page(s) are broken`,
      explanation: `The following URLs return errors or are unreachable: ${brokenLinks.map((l) => l.url).join(', ')}. AI systems that follow these links will encounter errors and may lower their trust in your documentation.`,
      recommendation:
        'Fix or remove broken links. Ensure all linked URLs return healthy responses.',
      pointsImpact: Math.min(brokenLinks.length * 3, 15),
    });
  }

  const emptyHtmlLinks = links.filter((l) => l.status === 'EMPTY_HTML');
  if (emptyHtmlLinks.length > 0) {
    fixes.push({
      ruleId: 'empty-html-links',
      severity: 'medium',
      title: `${emptyHtmlLinks.length} linked page(s) have no meaningful content`,
      explanation: `These pages return HTML but have very little or no text content visible to a crawler: ${emptyHtmlLinks.map((l) => l.url).join(', ')}. AI systems cannot extract information from empty pages.`,
      recommendation:
        'Ensure linked pages have server-rendered content. If they are SPA pages, implement server-side rendering or pre-rendering.',
      pointsImpact: Math.min(emptyHtmlLinks.length * 2, 10),
    });
  }

  const markdownLinks = links.filter((l) => l.status === 'MARKDOWN_CONTENT');
  if (markdownLinks.length > 0) {
    fixes.push({
      ruleId: 'markdown-links-assignment',
      severity: 'medium',
      title: `${markdownLinks.length} linked page(s) serve Markdown instead of HTML`,
      explanation: `These URLs serve Markdown text directly: ${markdownLinks.map((l) => l.url).join(', ')}. While this is highly valid and useful according to the llms.txt proposal, the literal assignment instructions require that linked URLs "serve real HTML to a crawler."`,
      recommendation:
        'To satisfy the specific assignment constraint, ensure that your linked resources are served as HTML pages.',
      pointsImpact: 0, // Informational/Assignment specific, doesn't dock from score but acts as a warning
    });
  }

  // AEO Fixes
  const scorableLinks = links.filter((l) => l.aeoScore != null);
  if (scorableLinks.length > 0) {
    let weakEvidence = 0;
    let weakStats = 0;
    let weakExtractability = 0;

    for (const l of scorableLinks) {
      if (l.aeoScore!.evidence < 1.5) weakEvidence++;
      if (l.aeoScore!.statistics < 1.0) weakStats++;
      if (l.aeoScore!.extractability < 1.0) weakExtractability++;
    }

    if (weakEvidence > scorableLinks.length * 0.5) {
      fixes.push({
        ruleId: 'aeo-weak-evidence',
        severity: 'low',
        title: 'Many pages lack explicit source attribution',
        explanation: 'Over half of your pages have weak or missing citations, reference sections, or explicit source attributions. AI models (GEO) look for these signals to establish trust and factual reliability.',
        recommendation: 'Add clear attribution to facts and claims, and include reference sections where appropriate.',
        pointsImpact: 0,
      });
    }

    if (weakExtractability > scorableLinks.length * 0.5) {
      fixes.push({
        ruleId: 'aeo-weak-extractability',
        severity: 'medium',
        title: 'Content structure limits AI extractability',
        explanation: 'Many of your pages lack clear answer-driven structures (e.g., "X provides..."), deep heading hierarchies, or structured definitions. This makes it harder for generative engines to confidently extract your claims.',
        recommendation: 'Use descriptive headings, lists, and direct answer-style writing (X is Y) in your key documentation pages.',
        pointsImpact: 0,
      });
    }
  }

  // /llms-full.txt
  if (!llmsFullTxt || llmsFullTxt.classification.classification !== 'REAL_MARKDOWN') {
    fixes.push({
      ruleId: 'llms-full-txt',
      severity: 'low',
      title: '/llms-full.txt is not available',
      explanation:
        'The /llms-full.txt file provides a complete, single-file version of your documentation. While optional, it makes it easier for AI systems to ingest your entire documentation corpus.',
      recommendation:
        'Create a /llms-full.txt file containing the full text of your key documentation pages.',
      pointsImpact: 5,
    });
  }

  // Sort by severity then by points impact
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  fixes.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.pointsImpact - a.pointsImpact;
  });

  return fixes;
}

function getRecommendation(ruleId: string): string {
  const recommendations: Record<string, string> = {
    'h1-exists':
      'Add an H1 heading at the top of your llms.txt file with your project or company name. Example: # My Project',
    'h1-first':
      'Ensure the H1 heading is the very first heading in the file.',
    'blockquote-exists':
      'Add a blockquote after the H1 with a brief description. Example: > A tool for doing X.',
    'h2-sections':
      'Organize your links into H2 sections like ## Documentation, ## API Reference.',
    'h2-has-links':
      'Add Markdown links within your H2 sections. Example: - [Getting Started](https://example.com/docs/start): How to begin.',
    'links-present':
      'Add Markdown hyperlinks pointing to your documentation and resources.',
    'urls-valid':
      'Fix any malformed URLs in your link lists. Ensure all URLs are absolute and syntactically correct.',
    'heading-hierarchy':
      'Use a clear H1 → H2 heading structure.',
  };

  return recommendations[ruleId] || 'Review and fix this issue.';
}

/**
 * Calculate the complete score and generate fixes.
 */
export function calculateScore(
  llmsTxt: FileAuditResult,
  llmsFullTxt: FileAuditResult | null,
  links: LinkCheckResult[]
): {
  score: number;
  grade: string;
  breakdown: ScoreBreakdown;
  fixes: Fix[];
} {
  const allChecks = llmsTxt.checks;

  const authenticity = scoreAuthenticity(llmsTxt, llmsFullTxt);
  const structure = scoreStructure(allChecks);
  const linkResolution = scoreLinkResolution(links);
  const linkQuality = scoreLinkQuality(links);

  const score = Math.round(authenticity + structure + linkResolution + linkQuality);
  const grade = scoreToGrade(score);

  const breakdown: ScoreBreakdown = {
    authenticity,
    authenticityMax: AUTHENTICITY_MAX,
    structure,
    structureMax: STRUCTURE_MAX,
    linkResolution,
    linkResolutionMax: LINK_RESOLUTION_MAX,
    linkQuality,
    linkQualityMax: LINK_QUALITY_MAX,
  };

  const fixes = generateFixes(llmsTxt, llmsFullTxt, allChecks, links);

  return { score, grade, breakdown, fixes };
}
