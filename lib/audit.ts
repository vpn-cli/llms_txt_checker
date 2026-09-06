/**
 * Main audit orchestrator.
 *
 * Coordinates the entire audit pipeline:
 * 1. Normalize URL
 * 2. Fetch /llms.txt
 * 3. Run soft-404 + SPA-shell detectors
 * 4. Classify response
 * 5. Parse Markdown + validate structure
 * 6. Fetch /llms-full.txt (same pipeline)
 * 7. Extract and crawl links
 * 8. Calculate score + generate fixes
 */

import { normalizeUrl } from './url';
import { safeFetch } from './fetcher';
import { detectSoft404 } from './soft404';
import { detectSpaShell, getProbeUrl } from './spa-detector';
import { classifyResponse } from './classifier';
import { parseMarkdown } from './markdown-parser';
import { validateStructure } from './validator';
import { checkLinks } from './link-checker';
import { calculateScore } from './scoring';
import { generateLlmsTxt } from './generator';
import type {
  AuditResult,
  FileAuditResult,
  ClassificationResult,
  DetectionResult,
  ValidationCheck,
  LinkCheckResult,
} from '@/types/audit';

const NO_DETECTION: DetectionResult = { detected: false, confidence: 0, reasons: [] };

/**
 * Audit a single file (/llms.txt or /llms-full.txt).
 */
async function auditFile(
  fileUrl: string,
  origin: string,
  isFullTxt = false
): Promise<FileAuditResult> {
  const fetchResult = await safeFetch(fileUrl);

  // If unreachable or error, return early
  if (fetchResult.error && fetchResult.status === null) {
    const classification: ClassificationResult = {
      classification: 'UNREACHABLE',
      confidence: 1,
      reasons: [fetchResult.error],
    };
    return {
      url: fileUrl,
      exists: false,
      fileStatus: 'Not Found',
      httpStatus: null,
      contentType: null,
      finalUrl: null,
      size: 0,
      classification,
      parsed: null,
      checks: [],
      error: fetchResult.error,
      generatedDraft: null,
    };
  }

  // HTTP 404 — quick exit
  if (fetchResult.status === 404 || fetchResult.status === 410) {
    const classification: ClassificationResult = {
      classification: 'NOT_FOUND',
      confidence: 1,
      reasons: [`HTTP ${fetchResult.status}`],
    };
    return {
      url: fileUrl,
      exists: false,
      fileStatus: 'Not Found',
      httpStatus: fetchResult.status,
      contentType: fetchResult.contentType,
      finalUrl: fetchResult.finalUrl,
      size: fetchResult.size,
      classification,
      parsed: null,
      checks: [],
      error: null,
      generatedDraft: null,
    };
  }

  // Run detectors
  let soft404Result = NO_DETECTION;
  let spaResult = NO_DETECTION;

  if (fetchResult.body && fetchResult.status === 200) {
    // Soft-404 detection
    soft404Result = detectSoft404(
      fetchResult.body,
      fetchResult.contentType,
      fetchResult.status
    );

    // SPA shell detection — fetch a random probe
    if (!soft404Result.detected && fetchResult.contentType?.includes('text/html')) {
      const probeUrl = getProbeUrl(origin);
      const probeResult = await safeFetch(probeUrl, { timeoutMs: 6000 });
      spaResult = detectSpaShell(
        fetchResult.body,
        fetchResult.contentType,
        probeResult
      );
    }
  }

  // Classify
  const classification = classifyResponse(fetchResult, soft404Result, spaResult);

  let fileStatus: import('@/types/audit').FileStatus = 'Misconfigured';
  if (classification.classification === 'REAL_MARKDOWN') {
    fileStatus = 'Valid';
  } else if (classification.classification === 'NOT_FOUND' || classification.classification === 'UNREACHABLE') {
    fileStatus = 'Not Found';
  }

  // Parse and validate if it looks like real Markdown
  let parsed = null;
  let checks: ValidationCheck[] = [];

  if (
    classification.classification === 'REAL_MARKDOWN' &&
    fetchResult.body
  ) {
    parsed = parseMarkdown(fetchResult.body);

    // Only run full structural validation on /llms.txt, not /llms-full.txt
    if (!isFullTxt) {
      checks = validateStructure(parsed);
    }
  }

  return {
    url: fileUrl,
    exists: classification.classification !== 'NOT_FOUND',
    fileStatus,
    httpStatus: fetchResult.status,
    contentType: fetchResult.contentType,
    finalUrl: fetchResult.finalUrl,
    size: fetchResult.size,
    classification,
    parsed,
    checks,
    error: fetchResult.error,
    generatedDraft: null,
  };
}

/**
 * Run the full audit pipeline.
 */
export async function runAudit(input: string): Promise<AuditResult> {
  // Step 1: Normalize URL
  const { origin, llmsTxtUrl, llmsFullTxtUrl } = normalizeUrl(input);

  const domain = new URL(origin).hostname;

  // Step 2: Audit /llms.txt
  const llmsTxt = await auditFile(llmsTxtUrl, origin, false);

  if (llmsTxt.fileStatus === 'Not Found') {
    llmsTxt.generatedDraft = await generateLlmsTxt(domain, origin);
  }

  // Step 3: Audit /llms-full.txt
  const llmsFullTxt = await auditFile(llmsFullTxtUrl, origin, true);

  // Step 4: Extract and check links (only if /llms.txt is real Markdown)
  let links: LinkCheckResult[] = [];
  let markdownReferences = 0;
  let uniqueUrls = 0;

  if (llmsTxt.parsed && llmsTxt.parsed.links.length > 0) {
    markdownReferences = llmsTxt.parsed.links.length;

    // Resolve relative URLs against origin
    const resolvedLinks = llmsTxt.parsed.links.map((link) => ({
      ...link,
      url: new URL(link.url, origin).href,
    }));

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueLinks = resolvedLinks.filter((link) => {
      if (seenUrls.has(link.url)) return false;
      seenUrls.add(link.url);
      return true;
    });

    uniqueUrls = uniqueLinks.length;
    links = await checkLinks(uniqueLinks);
  }

  const auditedUrls = links.length;
  let healthy = 0;
  let broken = 0;
  let unclassified = 0;

  for (const l of links) {
    if (l.status === 'HTML_CONTENT' || l.status === 'MARKDOWN_CONTENT') {
      healthy++;
    } else if (l.status === 'BROKEN' || l.status === 'SERVER_ERROR') {
      broken++;
    } else {
      unclassified++;
    }
  }

  if (healthy + broken + unclassified !== auditedUrls) {
    throw new Error(`Link status counts do not sum to audited URLs! Expected ${auditedUrls}, got ${healthy + broken + unclassified}`);
  }

  const linkStats = {
    markdownReferences,
    uniqueUrls,
    auditedUrls,
    healthy,
    broken,
    unclassified,
  };

  // Step 5: Calculate score
  const { score, grade, breakdown, fixes } = calculateScore(
    llmsTxt,
    llmsFullTxt,
    links
  );

  // Count check summary
  const allChecks = llmsTxt.checks;
  const passed = allChecks.filter((c) => c.status === 'pass').length;
  const warnings = allChecks.filter((c) => c.status === 'warning').length;
  const failed = allChecks.filter((c) => c.status === 'fail').length;

  return {
    domain,
    score,
    grade,
    scoreBreakdown: breakdown,
    files: {
      llmsTxt,
      llmsFullTxt: llmsFullTxt.classification.classification === 'NOT_FOUND' &&
        !llmsFullTxt.error
        ? null
        : llmsFullTxt,
    },
    links,
    fixes,
    summary: { passed, warnings, failed, linkStats },
    timestamp: new Date().toISOString(),
  };
}
