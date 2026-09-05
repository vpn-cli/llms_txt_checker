Build this assignment as a production-quality full-stack web application.

# PROJECT: LLMS.TXT CHECKER

## OBJECTIVE

Build a web application where a user enters a domain and the application audits that site's `/llms.txt`.

The application must:

1. Fetch `/llms.txt`.
2. Fetch `/llms-full.txt` if it exists.
3. Determine whether `/llms.txt` is a genuine Markdown/text file.
4. Explicitly distinguish between:

   * a genuine llms.txt file
   * a normal 404
   * a soft-404
   * an SPA shell / catch-all HTML application response
   * another invalid response
5. Validate the structure of `/llms.txt` against the current llms.txt proposal.
6. Extract the Markdown links from the file.
7. Check whether those URLs resolve.
8. Check whether those URLs return real, meaningful HTML to a crawler.
9. Generate a score out of 100.
10. Generate a ranked list of fixes, most important first.
11. Explain every failure and why it matters for AI retrieval/citation.
12. Include a README with detailed rule-by-rule reasoning.
13. Run the finished checker against `https://infrasity.com` and document the actual results.
14. Deploy the application publicly.
15. Keep the GitHub repository public.

IMPORTANT:
The assignment says:

"Fetch `/llms.txt` (and `/llms-full.txt` if present) and confirm it's a real file, not a soft-404 or an SPA shell."

Treat SOFT-404 and SPA SHELL as two distinct concepts and implement two separate detectors.

Do not simply classify every HTML response as an SPA shell or every 200 response as valid.

---

# TECH STACK

Use exactly this stack unless a technical limitation requires a small change:

Frontend:

* Next.js
* TypeScript
* Tailwind CSS
* App Router

Backend:

* Next.js Route Handlers
* Node.js fetch

Markdown:

* unified
* remark-parse

HTML:

* cheerio

Concurrency:

* p-limit

Testing:

* Vitest

Deployment:

* Vercel

Do NOT add:

* database
* authentication
* Redis
* background workers
* AI/LLM APIs
* payments
* unnecessary microservices

The goal is a strong assignment submission, not an overengineered SaaS product.

---

# ARCHITECTURE

Use clear separation of concerns.

Recommended structure:

app/
page.tsx
api/
check/
route.ts

components/
AuditForm.tsx
ScoreCard.tsx
FileStatus.tsx
CheckList.tsx
FixList.tsx
LinkTable.tsx

lib/
url.ts
fetcher.ts
soft404.ts
spa-detector.ts
markdown-parser.ts
validator.ts
link-checker.ts
scoring.ts
audit.ts
security.ts

types/
audit.ts

tests/
parser.test.ts
validator.test.ts
soft404.test.ts
spa-detector.test.ts
link-checker.test.ts
scoring.test.ts

README.md

Keep all core logic outside React components.

---

# PHASE 1 — PROJECT SETUP

Create the Next.js application with TypeScript, Tailwind and App Router.

Install:

* unified
* remark-parse
* cheerio
* p-limit
* vitest

Configure testing.

Make sure TypeScript and linting work.

Do not spend time polishing the UI yet.

---

# PHASE 2 — URL NORMALIZATION

Implement:

`normalizeUrl(input)`

It must accept:

* example.com
* https://example.com
* https://example.com/
* http://example.com

Normalize to an origin and derive:

`/llms.txt`

`/llms-full.txt`

Handle invalid URLs gracefully.

---

# PHASE 3 — SAFE HTTP FETCHER

Implement a reusable fetcher.

Every request must include:

* timeout
* redirect handling
* maximum redirect count
* maximum response size
* HTTP status
* content type
* final URL
* response body
* meaningful error information

Use a recognizable crawler User-Agent, for example:

`LLMSTxtChecker/1.0`

Protect the application from SSRF.

Reject or protect against obvious internal destinations such as:

* localhost
* 127.0.0.1
* ::1
* private IP ranges
* link-local addresses
* cloud metadata endpoints

Do not allow unbounded crawling.

---

# PHASE 4 — FETCH /LLMS.TXT

Fetch:

`https://domain.com/llms.txt`

Do NOT use:

`HTTP 200 = valid`

The response needs deeper validation.

Capture:

* URL
* status
* content type
* redirected URL
* body
* response size

---

# PHASE 5 — SOFT-404 DETECTOR

Create a dedicated module:

`lib/soft404.ts`

Implement:

`detectSoft404(...)`

A soft-404 means the server may return a successful status such as 200 while the content actually represents a missing page.

Use several signals.

Possible signals:

* title indicates 404/not found
* visible text indicates page does not exist
* obvious missing-page template
* response resembles a known missing-page response
* other strong missing-content indicators

Return:

{
detected: boolean,
confidence: number,
reasons: string[]
}

Do not mark every HTML page as a soft-404.

---

# PHASE 6 — SPA SHELL DETECTOR

Create a separate module:

`lib/spa-detector.ts`

Implement:

`detectSpaShell(...)`

An SPA shell means `/llms.txt` is returning the site's generic frontend application shell instead of the requested Markdown file.

Strong detection strategy:

1. Fetch `/llms.txt`.
2. Generate a randomized impossible path, for example:

`/__llms_checker_probe_847392`

3. Fetch that path.
4. Compare the two responses.

Look at:

* status
* content type
* body size
* title
* visible text
* normalized body
* DOM structure
* framework markers
* similarity between `/llms.txt` and the random probe

Framework indicators such as:

* `#root`
* `#__next`

may be used as supporting evidence.

Do NOT make framework markers the sole criterion.

If `/llms.txt` and a random nonexistent route return essentially the same HTML application document, classify that as strong SPA-shell evidence.

Return:

{
detected: boolean,
confidence: number,
reasons: string[]
}

---

# CRITICAL REQUIREMENT

The application must distinguish:

NOT_FOUND
SOFT_404
SPA_SHELL
REAL_MARKDOWN
HTML_PAGE
UNREACHABLE
INVALID_CONTENT

SOFT_404 and SPA_SHELL must be separate classifications.

A soft-404 may also technically be HTML, but the detector must explain the reason for the classification.

---

# PHASE 7 — AUTHENTICITY CLASSIFICATION

Create a final classifier that combines:

* HTTP status
* content type
* body inspection
* soft-404 detection
* SPA-shell detection
* Markdown plausibility

Example outcomes:

404 -> NOT_FOUND

200 + missing-page content -> SOFT_404

200 + HTML shell identical to random route -> SPA_SHELL

200 + actual Markdown -> REAL_MARKDOWN

200 + unrelated HTML page -> HTML_PAGE

network failure -> UNREACHABLE

other malformed response -> INVALID_CONTENT

Return:

{
classification,
confidence,
reasons
}

The UI must show the classification and the reasons.

---

# PHASE 8 — /LLMS-FULL.TXT

Fetch `/llms-full.txt` if available.

It is optional.

Missing `/llms-full.txt` should NOT be treated as a critical failure.

Audit:

* reachability
* content type
* whether it is obviously HTML
* whether it is a soft-404
* whether it is an SPA shell
* whether it contains plausible text/Markdown

Do not incorrectly force the complete `/llms.txt` structural rules onto `/llms-full.txt`.

---

# PHASE 9 — MARKDOWN PARSING

Use:

* unified
* remark-parse

Parse Markdown into an AST.

Do not build the entire validator using regular expressions.

Extract:

* H1
* blockquotes
* paragraphs
* H2 sections
* list items
* Markdown links
* link titles
* optional descriptions

Expected examples:

# Project Name

> Short summary

## Documentation

* [Getting Started](https://example.com/docs/start): How to get started.
* [API Reference](https://example.com/docs/api): Complete API documentation.

---

# PHASE 10 — STRUCTURAL VALIDATION

Implement these checks:

1. H1 exists.
2. H1 is the first meaningful heading.
3. Summary blockquote exists.
4. H2 sections are correctly recognized.
5. H2 sections contain link lists when present.
6. List entries use Markdown hyperlinks.
7. URLs are syntactically valid.
8. Heading hierarchy is reasonable.

IMPORTANT:

Do not incorrectly fail a file simply because it contains no H2 sections.

Treat the H1 as the required top-level structure.

Treat blockquote and H2 sections according to the current llms.txt proposal and clearly distinguish required structure from optional/recommended structure.

---

# PHASE 11 — LINK EXTRACTION

Extract links from the relevant Markdown lists.

Each link should become:

{
title,
url,
description,
section,
status,
finalUrl,
contentType,
isHtml,
hasMeaningfulContent,
error
}

Resolve relative URLs against the llms.txt origin.

Support absolute URLs.

Track whether a link is same-origin or external.

---

# PHASE 12 — LINK CRAWLER

For every extracted link:

Check:

* reachability
* HTTP status
* redirect chain
* final URL
* content type
* HTML presence
* meaningful textual content

Classify links such as:

HEALTHY
REDIRECTED
BROKEN
NON_HTML
EMPTY_HTML
SPA_SHELL
SERVER_ERROR

Do not call a 301/302/307/308 broken if it ultimately resolves to a healthy HTML resource.

Limit crawl concurrency with p-limit.

Limit total links checked to a sensible number, such as 50.

---

# PHASE 13 — REAL HTML CHECK

The assignment specifically asks that linked URLs:

"resolve and serve real HTML to a crawler."

Do not only check:

`content-type === text/html`

Also inspect the response.

Use Cheerio.

Check for:

* HTML document structure
* body
* meaningful visible text
* title where present
* content length
* obvious empty shell behavior

Do not require every page to have an H1.

Do not require every page to contain a particular element that is not part of the assignment.

The goal is to determine whether a crawler can actually obtain meaningful page content.

---

# PHASE 14 — QUALITY HEURISTICS

Add a limited set of best-practice checks.

Examples:

* descriptive link titles
* useful descriptions
* links pointing to meaningful resources
* content useful to an AI retrieval workflow
* avoid obviously weak links such as "click here"

IMPORTANT:

Clearly distinguish:

SPECIFICATION CHECK

from:

HEURISTIC / BEST PRACTICE

Do not present subjective heuristics as formal requirements.

---

# PHASE 15 — SCORING ENGINE

Build a transparent score out of 100.

Recommended categories:

Authenticity and availability: 40
Structure: 25
Linked URL health: 25
Link quality: 10

Expose score breakdown.

Critical failures should have stronger impact than cosmetic warnings.

For example:

* missing llms.txt = major penalty
* soft-404 = major penalty
* SPA shell = major penalty
* broken linked URLs = significant penalty
* missing summary = moderate penalty
* missing descriptions = small penalty

Do not make the final score a black box.

---

# PHASE 16 — RANKED FIXES

Every failed or warning rule should generate a fix:

{
ruleId,
severity,
title,
explanation,
recommendation,
pointsImpact
}

Severity:

critical
high
medium
low

Rank fixes by practical importance.

Example:

1. CRITICAL — /llms.txt is an SPA shell
2. HIGH — 5 linked pages return 404
3. MEDIUM — Summary blockquote is missing
4. LOW — Link descriptions are missing

The explanation must tell the user why the problem matters for AI retrieval/citation.

---

# PHASE 17 — API

Create:

POST /api/check

Request:

{
"url": "https://example.com"
}

Return a structured object similar to:

{
"domain": "example.com",
"score": 78,
"grade": "B",
"files": {
"llmsTxt": {},
"llmsFullTxt": {}
},
"classification": {
"type": "REAL_MARKDOWN",
"confidence": 0.98,
"reasons": []
},
"checks": [],
"links": [],
"fixes": [],
"summary": {
"passed": 12,
"warnings": 3,
"failed": 2
}
}

Make strong TypeScript types for all of this.

---

# PHASE 18 — FRONTEND

Build a polished but simple interface.

Landing page:

LLMS.TXT CHECKER

Short explanation.

Domain input.

Audit button.

Results page/section should show:

1. Overall score.
2. Grade.
3. /llms.txt status.
4. /llms-full.txt status.
5. Authenticity classification.
6. Soft-404 / SPA-shell reasoning.
7. Passed/warning/failed counts.
8. Structural checks.
9. Linked URL health.
10. Ranked fixes.

Prioritize readability.

Do not create a huge dashboard.

Include:

* loading state
* timeout state
* invalid URL state
* unreachable website state
* no llms.txt state
* generic server error state

---

# PHASE 19 — TESTING

Write unit tests for:

1. Genuine Markdown.
2. Missing H1.
3. Missing blockquote.
4. H2 sections.
5. malformed Markdown links.
6. normal 404.
7. soft-404.
8. SPA shell.
9. genuine HTML.
10. empty HTML.
11. healthy linked page.
12. broken linked page.
13. redirecting page.
14. non-HTML linked resource.

Most important:

Tests MUST prove:

REAL_MARKDOWN != SOFT_404

REAL_MARKDOWN != SPA_SHELL

SOFT_404 != SPA_SHELL

Test the scoring engine independently.

---

# PHASE 20 — README

Write a high-quality README.

This is part of the evaluation and should demonstrate independent technical reasoning.

Include:

# LLMS.txt Checker

## Overview

## Why llms.txt matters

Explain the AI retrieval problem.

## Architecture

Explain the request flow.

## Validation Rules

For EVERY rule explain:

* what we check
* how we detect it
* why it matters for AI retrieval/citation
* whether it is a specification requirement or heuristic
* severity
* score impact

Especially explain:

* file existence
* real-file detection
* soft-404 detection
* SPA-shell detection
* H1
* blockquote
* H2 sections
* Markdown link lists
* link resolution
* HTTP status
* HTML content
* quality heuristics

## Soft-404 vs SPA Shell

Explicitly explain the distinction.

## Scoring

Explain exactly how the score works.

## Security

Explain SSRF prevention, request limits, timeouts and crawl limits.

## Limitations

Be honest about what the detector cannot guarantee.

## Local Development

Provide setup commands.

## Deployment

Explain Vercel deployment.

## Infrasity Audit

Include actual audit findings from:

https://infrasity.com

DO NOT INVENT FINDINGS.

---

# PHASE 21 — INFRASITY AUDIT

After all implementation is complete:

Run the checker against:

https://infrasity.com

Record the actual output.

Report:

* total score
* llms.txt classification
* llms-full.txt status
* structural failures
* warnings
* broken links
* non-HTML resources
* SPA-shell or soft-404 findings
* ranked fixes

Then manually sanity-check the important findings to make sure the checker itself is not generating false positives.

---

# PHASE 22 — DEPLOYMENT

Deploy the application publicly using Vercel.

Push the source code to a public GitHub repository.

Before considering the project complete, test the production URL end-to-end.

Use the deployed application to audit:

https://infrasity.com

and make sure the results are stable and reproducible.

---

# FINAL ACCEPTANCE CRITERIA

Do not consider the project complete until ALL of these are true:

[ ] Domain input works.
[ ] /llms.txt is fetched.
[ ] /llms-full.txt is fetched when available.
[ ] Genuine Markdown is recognized.
[ ] Normal 404 is recognized.
[ ] Soft-404 detection works.
[ ] SPA-shell detection works.
[ ] Soft-404 and SPA-shell remain distinct.
[ ] Markdown is parsed using an AST.
[ ] H1 is validated.
[ ] Blockquote is validated.
[ ] H2 sections are validated.
[ ] Markdown link lists are validated.
[ ] URLs are extracted.
[ ] Linked URLs are crawled.
[ ] HTTP status is checked.
[ ] Content-Type is checked.
[ ] Real HTML/content is checked.
[ ] Score is transparent.
[ ] Fixes are ranked.
[ ] Tests pass.
[ ] README explains every rule.
[ ] README explains AI citation/retrieval relevance.
[ ] Infrasity has been audited.
[ ] Infrasity findings are documented.
[ ] App is deployed.
[ ] GitHub repository is public.

---

# DEVELOPMENT BEHAVIOR

Work incrementally.

Do NOT generate the entire project blindly in one pass.

Implement in phases and verify each phase before moving to the next.

At every phase:

1. implement
2. run tests/type checks
3. inspect errors
4. fix issues
5. only then continue

Prioritize correctness of the crawler and validators over visual polish.

Do not fabricate technical results.

Do not claim a website has a problem unless the checker actually observed evidence for it.

Keep formal specification validation separate from heuristic recommendations.

When finished, provide:

1. local run instructions
2. test results
3. production URL
4. GitHub repository URL
5. final Infrasity audit score
6. summary of the main findings
