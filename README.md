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

### 4. AI-Link Quality / AEO Content Layer (10 Points)
- **What is checked:** The deterministic *extractability* of the crawled content at the destination URL, using a research-informed AEO (Artificial Engine Optimization) scoring model.
- **Why it matters:** A technically valid `llms.txt` can still point to weak content. To ensure maximum AI visibility and trust, the linked content itself must be easily extractable and factually grounded.
- **Source:** Inspired by recent AEO research, including *GEO: Generative Engine Optimization* (KDD 2024), we evaluate linked pages on 5 deterministic dimensions:
  - **Evidence (3.0 pts):** Explicit source attribution, reference sections, and citations.
  - **Statistics (2.5 pts):** Concrete facts, percentages, currency, and quantities.
  - **Quotations (1.5 pts):** Attributed quotes and statements.
  - **Extractability (2.0 pts):** Answer-driven phrasing ("X is...") and structural hierarchy (H2s/H3s).
  - **Readability (1.0 pts):** Lightweight Flesch Reading Ease approximation.
- **Scoring:** The final AI-Link Quality score is the average AEO score across all linked `HTML_CONTENT` and `MARKDOWN_CONTENT` pages.
- **Methodological Guardrails:** This tool evaluates *deterministic, extractable signals* using heuristics (regex and text analysis). It does **not** use LLM-as-a-judge, embeddings, or make claims about predicting actual AI search engine rankings. It simply enforces structural content best practices that align with generative engine preferences.

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

---

## Infrasity Audit Results

A live audit against `infrasity.com` produces the following result:

- **Technical Compliance**: 90/90 (Perfect Score)
- **AI/Link Quality (AEO)**: 4.4 / 10
- **Total Score**: 94/100 (Grade: A)

### Interpretation
The 90/90 technical score demonstrates that Infrasity satisfies all literal llms.txt protocol requirements (valid H1, valid formatting, healthy HTML targets, etc.). The 4.4/10 AEO score indicates that while the infrastructure is perfect, the actual content found at the destination marketing URLs lacks academic evidence, source attributions, and deep extractability structures compared to technical documentation standards. 

This nuanced score highlights the checker's ability to cleanly decouple **protocol compliance** from **content quality**.
