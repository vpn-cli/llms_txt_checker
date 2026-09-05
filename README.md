# LLMS.TXT Checker

A full-stack Next.js web application that audits a domain's `/llms.txt` file for AI discoverability. This checker distinguishes between the official `llms.txt` specification compliance and assignment-specific crawlability heuristics.

## Features

- **Robust fetching:** Handles timeouts, redirects, and SSRF protections.
- **Smart Detection:** Identifies Soft-404s and SPA shells that return HTTP 200.
- **Markdown parsing:** Evaluates the structure according to the llms.txt proposal.
- **Link crawling:** Concurrently checks all extracted URLs for resolution and crawlability.
- **Scoring Engine:** Generates a transparent 100-point score with actionable fixes.

---

## Rules & Scoring Matrix

This checker distinguishes specification compliance from assignment-specific crawlability requirements. A linked Markdown document may be valid and highly useful for AI retrieval while still failing the assignment's narrower requirement that linked URLs serve HTML. We therefore report these as separate dimensions rather than collapsing them into a single pass/fail result.

### 1. Authenticity & Availability (40 Points)
- **What is checked:** The existence and accessibility of `/llms.txt` and `/llms-full.txt`.
- **Why it matters:** Without this file, AI systems cannot discover or index your documentation.
- **Source:** llms.txt v2 proposal.
- **Scoring:**
  - Real Markdown at `/llms.txt`: +30 pts
  - Valid text/plain or text/markdown content type: +5 pts
  - `/llms-full.txt` exists: +5 pts
  - Soft-404s or SPA shells automatically fail this category.

### 2. Structure (25 Points)
- **What is checked:** Document hierarchy (H1 presence, optional blockquotes, optional H2 sections).
- **Why it matters:** Clean heading hierarchies allow AI systems to reliably parse and chunk the file.
- **Source:** 
  - H1: `proposal-required`
  - Blockquote: `proposal-optional / expected format`
  - H2 sections: `proposal-optional / expected format`
  - Link lists inside H2: `proposal-required`
- **Scoring:** Points are distributed among the `proposal-required` structural elements. Missing an H1 fails the check. Missing an optional blockquote raises a warning but does not penalize the score. Link list syntax is only required if H2 sections are present.

### 3. Link Resolution & Crawlability (25 Points)
- **What is checked:** Checks if all extracted URLs resolve (HTTP < 400) and if they serve content that a crawler can read (HTML with text, or Markdown).
- **Why it matters:** AI systems need to crawl these URLs. Broken links or empty SPA shells break AI ingestion.
- **Source:** `heuristic`
- **Scoring:** 
  - `HTML_CONTENT` (with meaningful text) or `MARKDOWN_CONTENT` receives full points.
  - Redirects or `OTHER_NON_HTML` receive partial points.
  - `EMPTY_HTML` (SPA shells) and broken links receive 0 points.

### 4. AI/Link Quality (10 Points)
- **What is checked:** The length of descriptions, strength of titles, and assignment-specific requirements.
- **Why it matters:** Descriptive link titles and summaries help RAG/LLM systems understand what each resource contains before fetching it.
- **Source:** `assignment requirement` (HTML constraint) and `heuristic` (title/description quality).
- **Scoring:** Points awarded for descriptive link titles and link descriptions. 
  - **Assignment-Specific Check:** If a link resolves to a valid Markdown file (e.g. `MARKDOWN_CONTENT`), it is highly useful for AI, but it triggers an assignment-specific warning because it does not satisfy the literal assignment requirement to "serve real HTML to a crawler." This provides nuance without intrinsically penalizing valid LLM-friendly resources.

---

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Live Audit

To run a live static audit from the CLI against a domain:
```bash
npx tsx scripts/live-audit.ts
```
