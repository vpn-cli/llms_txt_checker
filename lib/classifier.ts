/**
 * Authenticity classifier.
 *
 * Combines HTTP status, content type, body inspection, soft-404 detection,
 * SPA-shell detection, and Markdown plausibility into a single classification.
 *
 * Classifications:
 *   NOT_FOUND     — HTTP 404 or similar client error
 *   SOFT_404      — HTTP 200 but content is a missing-page template
 *   SPA_SHELL     — HTTP 200 but content is a generic SPA catch-all
 *   REAL_MARKDOWN  — HTTP 200 with genuine Markdown/text content
 *   HTML_PAGE     — HTTP 200 with unrelated HTML (not a soft-404 or SPA shell)
 *   UNREACHABLE   — Network failure, timeout, DNS error
 *   INVALID_CONTENT — Other malformed response
 */

import type {
  ClassificationResult,
  DetectionResult,
  FetchResult,
} from '@/types/audit';

/**
 * Check if a string looks like Markdown content (not HTML).
 */
function looksLikeMarkdown(body: string): boolean {
  const trimmed = body.trim();

  // Must not start with typical HTML markers
  if (/^\s*<(!doctype|html|head|body|div|script)/i.test(trimmed)) {
    return false;
  }

  // Check for Markdown-like patterns
  const markdownSignals = [
    /^#\s+.+/m,                  // H1 heading
    /^##\s+.+/m,                 // H2 heading
    /^>\s+.+/m,                  // Blockquote
    /^\*\s+.+/m,                 // Unordered list
    /^-\s+.+/m,                  // Unordered list (dash)
    /^\d+\.\s+.+/m,             // Ordered list
    /\[.+\]\(.+\)/,             // Markdown link
  ];

  let matches = 0;
  for (const pattern of markdownSignals) {
    if (pattern.test(trimmed)) matches++;
  }

  return matches >= 2;
}

/**
 * Check if content type suggests text/markdown.
 */
function isTextContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return (
    contentType.includes('text/plain') ||
    contentType.includes('text/markdown') ||
    contentType.includes('text/x-markdown')
  );
}

/**
 * Classify the /llms.txt response.
 */
export function classifyResponse(
  fetchResult: FetchResult,
  soft404Result: DetectionResult,
  spaShellResult: DetectionResult
): ClassificationResult {
  const { status, contentType, body, error } = fetchResult;

  // Unreachable — network failure
  if (error && status === null) {
    return {
      classification: 'UNREACHABLE',
      confidence: 1,
      reasons: [`Failed to reach server: ${error}`],
    };
  }

  // Not Found — HTTP 404 or 410
  if (status === 404 || status === 410) {
    return {
      classification: 'NOT_FOUND',
      confidence: 1,
      reasons: [`Server returned HTTP ${status}`],
    };
  }

  // Other server errors
  if (status && status >= 500) {
    return {
      classification: 'UNREACHABLE',
      confidence: 0.9,
      reasons: [`Server error: HTTP ${status}`],
    };
  }

  // Other client errors (not 404/410)
  if (status && status >= 400) {
    return {
      classification: 'INVALID_CONTENT',
      confidence: 0.9,
      reasons: [`Client error: HTTP ${status}`],
    };
  }

  // From here, we expect status 200 (or 2xx)
  if (!body || body.trim().length === 0) {
    return {
      classification: 'INVALID_CONTENT',
      confidence: 0.9,
      reasons: ['Empty response body'],
    };
  }

  // Soft-404 check — must come before SPA check
  // A response can be both soft-404 and SPA shell, but soft-404 is more specific
  if (soft404Result.detected) {
    return {
      classification: 'SOFT_404',
      confidence: soft404Result.confidence,
      reasons: soft404Result.reasons,
    };
  }

  // SPA shell check
  if (spaShellResult.detected) {
    return {
      classification: 'SPA_SHELL',
      confidence: spaShellResult.confidence,
      reasons: spaShellResult.reasons,
    };
  }

  // Check for genuine Markdown
  const isText = isTextContentType(contentType);
  const isMarkdown = looksLikeMarkdown(body);

  if (isText && isMarkdown) {
    return {
      classification: 'REAL_MARKDOWN',
      confidence: 0.95,
      reasons: ['Content-type is text, content has Markdown structure'],
    };
  }

  if (isMarkdown) {
    return {
      classification: 'REAL_MARKDOWN',
      confidence: 0.85,
      reasons: [
        'Content has Markdown structure',
        contentType
          ? `Content-type is "${contentType}" (expected text/plain or text/markdown)`
          : 'No content-type header',
      ],
    };
  }

  if (isText && !isMarkdown) {
    // Text content type but doesn't look like Markdown
    return {
      classification: 'REAL_MARKDOWN',
      confidence: 0.6,
      reasons: [
        'Content-type suggests text file',
        'Content does not have strong Markdown structure — may be a plain text llms.txt',
      ],
    };
  }

  // HTML that's not a soft-404 or SPA shell
  if (contentType?.includes('text/html')) {
    return {
      classification: 'HTML_PAGE',
      confidence: 0.8,
      reasons: [
        'Response is HTML but not detected as soft-404 or SPA shell',
        'Server may be serving an HTML page at the /llms.txt path',
      ],
    };
  }

  // Fallback
  return {
    classification: 'INVALID_CONTENT',
    confidence: 0.5,
    reasons: [
      `Unexpected content type: ${contentType || 'unknown'}`,
      'Could not determine if content is a valid llms.txt file',
    ],
  };
}
