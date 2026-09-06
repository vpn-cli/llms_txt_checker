// ─── File Classifications ────────────────────────────────────────────
export type FileClassification =
  | 'REAL_MARKDOWN'
  | 'NOT_FOUND'
  | 'SOFT_404'
  | 'SPA_SHELL'
  | 'HTML_PAGE'
  | 'UNREACHABLE'
  | 'INVALID_CONTENT';

// ─── Link Classifications ───────────────────────────────────────────
export type LinkClassification =
  | 'HTML_CONTENT'
  | 'MARKDOWN_CONTENT'
  | 'OTHER_NON_HTML'
  | 'EMPTY_HTML'
  | 'BROKEN'
  | 'SPA_SHELL'
  | 'SERVER_ERROR';

// ─── Severity Levels ────────────────────────────────────────────────
export type Severity = 'critical' | 'high' | 'medium' | 'low';

// ─── Check Status ───────────────────────────────────────────────────
export type CheckStatus = 'pass' | 'warning' | 'fail';

// ─── Check Type ─────────────────────────────────────────────────────
export type CheckType = 'proposal-required' | 'proposal-optional' | 'assignment-heuristic';

// ─── Fetcher ────────────────────────────────────────────────────────
export interface FetchResult {
  url: string;
  status: number | null;
  contentType: string | null;
  finalUrl: string | null;
  body: string | null;
  size: number;
  redirectCount: number;
  error: string | null;
}

// ─── Detectors ──────────────────────────────────────────────────────
export interface DetectionResult {
  detected: boolean;
  confidence: number;
  reasons: string[];
}

export interface ClassificationResult {
  classification: FileClassification;
  confidence: number;
  reasons: string[];
}

// ─── Markdown Parsing ───────────────────────────────────────────────
export interface ParsedSection {
  heading: string;
  level: number;
  links: ParsedLink[];
  content: string;
}

export interface ParsedLink {
  title: string;
  url: string;
  description: string;
  section: string;
}

export interface ParsedMarkdown {
  h1: string | null;
  blockquote: string | null;
  sections: ParsedSection[];
  links: ParsedLink[];
  raw: string;
}

// ─── Validation ─────────────────────────────────────────────────────
export interface ValidationCheck {
  ruleId: string;
  type: CheckType;
  status: CheckStatus;
  title: string;
  message: string;
}

// ─── AEO / AI-Link Quality ────────────────────────────────────────────
export interface AeoScore {
  evidence: number;        // Max 3.0
  statistics: number;      // Max 2.5
  quotations: number;      // Max 1.5
  extractability: number;  // Max 2.0
  readability: number;     // Max 1.0
  total: number;           // Max 10.0
}

// ─── Link Checking ──────────────────────────────────────────────────
export interface LinkCheckResult {
  title: string;
  url: string;
  description: string;
  section: string;
  status: LinkClassification;
  httpStatus: number | null;
  finalUrl: string | null;
  contentType: string | null;
  resolves: boolean;
  isHtml: boolean;
  isMarkdown: boolean;
  hasMeaningfulContent: boolean;
  aeoScore: AeoScore | null;
  error: string | null;
}

export interface HtmlMetadata {
  titlePresent: boolean;
  h1Count: number;
  h2h3Count: number;
  liCount: number;
  tableCount: number;
  pCount: number;
  textLength: number;
}

// ─── Scoring ────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  authenticity: number;
  authenticityMax: number;
  structure: number;
  structureMax: number;
  linkResolution: number;
  linkResolutionMax: number;
  linkQuality: number;
  linkQualityMax: number;
}

export interface Fix {
  ruleId: string;
  severity: Severity;
  title: string;
  explanation: string;
  recommendation: string;
  pointsImpact: number;
}

// ─── File Audit Result ──────────────────────────────────────────────
export interface FileAuditResult {
  url: string;
  exists: boolean;
  httpStatus: number | null;
  contentType: string | null;
  finalUrl: string | null;
  size: number;
  classification: ClassificationResult;
  parsed: ParsedMarkdown | null;
  checks: ValidationCheck[];
  error: string | null;
}

// ─── Full Audit Result ──────────────────────────────────────────────
export interface AuditResult {
  domain: string;
  score: number;
  grade: string;
  scoreBreakdown: ScoreBreakdown;
  files: {
    llmsTxt: FileAuditResult;
    llmsFullTxt: FileAuditResult | null;
  };
  links: LinkCheckResult[];
  fixes: Fix[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    linkStats: {
      markdownReferences: number;
      uniqueUrls: number;
      auditedUrls: number;
      healthy: number;
      broken: number;
      unclassified: number;
    };
  };
  timestamp: string;
}
