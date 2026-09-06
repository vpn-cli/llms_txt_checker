# LLMS.TXT Checker / AEO Audit Tool

I built this checker to answer a simple, practical question: if an AI crawler discovers your website through its `llms.txt` file, is that file actually usable? Are the linked pages reachable, and do they contain useful information for machine consumption?

While the `llms.txt` proposal is a fantastic standard for AI discoverability, a URL returning a `200 OK` doesn't mean much on its own. I wanted to cut through the ambiguity and see if a site's implementation is structurally sound, machine-readable, and fundamentally useful to an agentic system.

To be clear up front: this is a technical auditing tool. It evaluates observable file characteristics, network responses, and content patterns. It is *not* an AI ranking predictor, and it doesn't guarantee better visibility in any search engine or language model. 

---

## What I Built

The checker runs a complete validation pipeline:

1. **Fetch**: Checks `/llms.txt` and verifies it's a genuine file, not a soft-404 or an empty SPA (Single Page Application) shell.
2. **Parse & Validate**: Parses the Markdown into an AST (Abstract Syntax Tree) and validates its structure against the proposal's requirements.
3. **Extract & Crawl**: Extracts linked URLs and crawls them concurrently.
4. **Inspect**: Checks HTTP statuses, handles redirects, and inspects the DOM to ensure pages have real, server-rendered content.
5. **Score**: Evaluates the content using a deterministic AEO (Answer Engine Optimization) heuristic.
6. **Report**: Produces a technical validity score (out of 100), an average AEO score (out of 10), and a prioritized list of fixes.

---

## Why llms.txt?

The `llms.txt` proposal gives language models a standardized way to discover a website's most important content. 

When auditing these files, I realized it was critical to distinguish between the **proposal's rules**, the **specific requirements of this assignment**, and **my own heuristics**. I designed this tool to check all three dimensions transparently without blurring the lines between them.

---

## What I Check

| Area | What I check | Why it matters |
| :--- | :--- | :--- |
| **File authenticity** | HTTP response, content type, soft-404s, SPA shells | A `200 OK` status doesn't always mean a valid file exists. |
| **Structure** | H1, H2s, Markdown links, document hierarchy | Predictable structures make the file easier for crawlers to parse. |
| **Link resolution** | HTTP status codes, redirects, content types | Broken retrieval paths make your information impossible to consume. |
| **Content access** | HTML payloads, Markdown content, empty DOMs | Different content types serve different purposes depending on the assignment. |
| **AEO Quality** | Evidence, statistics, quotations, extractability | Measures observable traits that support factual information extraction. |

---

## Technical Implementation

Here are a few key engineering decisions I made:

* **Markdown parsing:** I use `unified` and `remark-parse` to parse Markdown into an AST instead of relying on fragile regex. 
* **HTML analysis:** I use `cheerio` to inspect the DOM of linked pages, preserving headings, lists, and text while stripping out boilerplate.
* **Smart Crawling:** URL crawling is strictly controlled using `p-limit` to prevent overwhelming target servers.
* **Soft-404 & SPA detection:** The checker compares the `/llms.txt` response against a deliberately non-existent path to detect missing-page templates and empty frontend JavaScript shells.
* **Security:** Implemented SSRF protection, request timeouts, response-size limits, and bounded redirect handling.

---

## AEO / AI-Link Quality Score

For every linked page that successfully resolves, the tool calculates a 10-point content-quality score based on observable patterns:

| Signal | Weight |
| :--- | ---: |
| Evidence / source attribution | 3.0 |
| Statistics / concrete facts | 2.5 |
| Attributed quotations | 1.5 |
| Content extractability | 2.0 |
| Fluency / readability | 1.0 |
| **Total** | **10.0** |

I used existing GEO (Generative Engine Optimization) research to motivate the *types* of signals I inspect, but the 10-point weighting is my own engineering heuristic. 

I deliberately kept the scoring deterministic. There is no "LLM-as-a-judge" here; the rules are strictly code-based so that every score can be traced back to an explicit, repeatable rule.

---

## Proposal vs. Assignment vs. Heuristics

To keep the scoring completely transparent, rules are strictly categorized:

* **Proposal-required:** File must have an H1.
* **Proposal-optional:** Blockquotes, H2 sections, and properly nested file lists.
* **Assignment-specific:** Linked pages must resolve and serve real HTML (Markdown links are flagged as an assignment constraint, but remain valid under proposal semantics).
* **My heuristics:** AEO scoring, evidence detection, and soft-404/SPA-shell logic.

---

## Scoring Dimensions

The system evaluates websites across two distinct dimensions:

1. **Technical Score (out of 100):** Measures if the `llms.txt` file is authentic, structurally valid, and if its links can actually be consumed. 
2. **AEO Score (out of 10):** Measures observable content-quality characteristics of the linked pages. 

A high technical score just means the file is perfectly constructed; it does not mean the content itself is highly optimized for generative engines.

---

## Example Audit & Validation

I tested the tool against `infrasity.com` (as required by the assignment), which returned a **Technical Score of 95/100 (Grade A)**. The tool correctly verified the file's authenticity and crawled all 39 unique URLs, finding 0 broken links.

For the **AEO Score**, the site averaged a moderate score (e.g., ~4.4/10). A lower AEO score does not mean a company has bad content. It simply means the pages contain fewer of the specific, highly structured evidence-oriented signals (like dense statistical data or academic citations) measured by this heuristic. 

I also ran qualitative sanity checks against real-world implementations like **Monday.com, GitHub, Adobe, and Clairvyn**. Across all tests, the pipeline successfully identified broken links, enforced link-count invariants, and handled missing optional files without improper penalization.

---

## Testing & Tech Stack

The project is backed by a robust Vitest suite with 42 passing tests covering parsers, validators, soft-404 detection, and edge cases like canonical redirects.

**Tech Stack:**
* Next.js 16 (App Router)
* TypeScript & Tailwind CSS
* `unified` / `remark-parse` / `cheerio`
* `p-limit` / Vitest / Vercel

---

## Running Locally

Clone the repository and install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 

To run the test suite or verify the production build:
```bash
npm test
npm run build
```

---

## Limitations

Because the timeframe for this submission was short, I had to scope the project strictly to achievable, deterministic rules. I want to be upfront about the limitations of this approach:

* **Heuristics, not AI:** The AEO score is a deterministic heuristic, not a machine-learning model, and it absolutely does not predict actual AI citations.
* **Proprietary Systems:** It does not model proprietary retrieval systems (like OpenAI or Perplexity).
* **Pattern Matching:** Evidence, statistics, and quotation detection rely on textual markers which can occasionally miss nuanced writing.
* **Edge Cases:** Soft-404 and SPA detection use heuristic comparisons and can occasionally encounter server-specific edge cases.
* **Real-time Changes:** Live websites can change immediately after an audit.

---

## Future Integrations

Given more time, I would explore expanding the architecture to include:

1. **Headless Browser Rendering:** Integrating Puppeteer or Playwright to fully execute JavaScript-heavy SPA pages before extracting content, rather than just analyzing the initial HTML payload.
2. **LLM-as-a-Judge:** Adding a lightweight LLM call to qualitatively evaluate the usefulness and tone of the extracted text payload.
3. **Vector Similarity Checks:** Testing if the content in the `llms.txt` actually aligns with the core brand messaging of the domain using embeddings and cosine similarity.
4. **Historical Monitoring:** Setting up a CRON job to track how a site's AEO and technical scores trend over time.

---

## Final Notes

I built this as an engineering project to understand the actual gap between *having* an `llms.txt` file and having one that is truly usable for machine retrieval. It was a great challenge in balancing strict specification adherence with the messy realities of the live web. Ultimately, this tool provides actionable, technical truth about how a site presents itself to an automated agent.
