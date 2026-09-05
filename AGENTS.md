# LLMS.TXT Checker

This is a full-stack Next.js web application. Not a SaaS product — an assignment submission.

## Read Before Anything Else

Read in this exact order before any implementation:

1. context/project-overview.md
2. context/architecture.md
3. context/build-plan.md
4. context/progress-tracker.md

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- unified + remark-parse (Markdown parsing)
- cheerio (HTML inspection)
- p-limit (concurrency)
- vitest (testing)

## Rules That Never Change

- Do NOT add: database, authentication, Redis, background workers, AI/LLM APIs, payments, unnecessary microservices
- Keep all core logic outside React components — in lib/
- Distinguish SPECIFICATION CHECK from HEURISTIC / BEST PRACTICE
- SOFT_404 and SPA_SHELL must be separate classifications
- Do not fabricate technical results
- Work incrementally — implement, test, fix, then continue

## Available Skills

- `/architect` — before any complex feature
- `/imprint` — after any new UI component
- `/review` — before demo or when something feels off
- `/recover` — when something breaks after one failed correction
- `/remember save` — when a feature spans multiple sessions
- `/remember restore` — when returning after a multi-session feature
