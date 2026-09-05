# Architecture — LLMS.TXT Checker

## File Structure

```
app/
  page.tsx                    # Landing page with audit form + results
  api/
    check/
      route.ts                # POST /api/check endpoint

components/
  AuditForm.tsx               # Domain input + submit
  ScoreCard.tsx               # Overall score + grade display
  FileStatus.tsx              # /llms.txt and /llms-full.txt status
  CheckList.tsx               # Structural validation checks
  FixList.tsx                 # Ranked fixes
  LinkTable.tsx               # Extracted link health table

lib/
  url.ts                      # URL normalization
  fetcher.ts                  # Safe HTTP fetcher with timeouts
  security.ts                 # SSRF protection
  soft404.ts                  # Soft-404 detector
  spa-detector.ts             # SPA shell detector
  classifier.ts              # Authenticity classification (combines detectors)
  markdown-parser.ts          # AST-based Markdown parser (unified + remark-parse)
  validator.ts                # Structural validation + quality heuristics
  link-checker.ts             # Link crawler with concurrency (p-limit + cheerio)
  scoring.ts                  # Scoring engine + fix generation
  audit.ts                    # Main audit orchestrator

types/
  audit.ts                    # All TypeScript interfaces

tests/
  parser.test.ts
  validator.test.ts
  soft404.test.ts
  spa-detector.test.ts
  link-checker.test.ts
  scoring.test.ts
```

## Separation of Concerns

- **Components** — rendering only, no business logic
- **lib/** — all core logic, fully testable without React
- **types/** — shared interfaces, no runtime code
- **app/api/** — thin HTTP layer that calls lib/audit.ts

## Data Flow

```
User enters domain
  → POST /api/check { url }
    → normalizeUrl(input)
    → fetch /llms.txt
    → detectSoft404(response)
    → detectSpaShell(origin, response)
    → classifyAuthenticity(all signals)
    → fetch /llms-full.txt (same pipeline)
    → parseMarkdown(body) → AST
    → validateStructure(ast)
    → extractLinks(ast)
    → crawlLinks(links) with p-limit
    → checkRealHtml(responses) with cheerio
    → calculateScore(all results)
    → generateFixes(all results)
  ← Return structured AuditResult
```
