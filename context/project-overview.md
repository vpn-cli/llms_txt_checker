# Project Overview — LLMS.TXT Checker

## Objective

Build a web application where a user enters a domain and the application audits that site's `/llms.txt`.

The checker must:
- Fetch `/llms.txt` and `/llms-full.txt`
- Classify the response (real Markdown, 404, soft-404, SPA shell, HTML page, unreachable, invalid)
- Validate Markdown structure against the llms.txt proposal
- Extract and crawl linked URLs
- Check whether linked URLs return real, meaningful HTML
- Generate a transparent score out of 100
- Generate ranked fixes with AI retrieval/citation explanations
- Deploy publicly on Vercel with a public GitHub repo

## What This Is NOT

- Not a SaaS product
- Not overengineered
- No database, no auth, no Redis, no background workers, no AI/LLM APIs, no payments
- A focused assignment submission that demonstrates technical depth

## Key Requirement

SOFT_404 and SPA_SHELL are two distinct concepts with two separate detectors. Never conflate them.

## Target Audit

The finished checker will be run against `https://infrasity.com` and the actual results documented.
