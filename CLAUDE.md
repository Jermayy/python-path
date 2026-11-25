# Python Path

Follows Jem's engineering playbook: @~/.claude/playbook/PLAYBOOK.md
(Global standards live in `~/Coding Projects/engineering-playbook`. Anything below overrides them for this project.)

## What this is

Gamified web app teaching Python from zero to Forward Deployed / AI Orchestration Engineer level. MVP, deployed on Vercel.

## Stack

- Language/runtime: TypeScript (strict), Node 24 (`.nvmrc`, Volta pin in package.json)
- Frameworks: Next.js 16 App Router with Cache Components + React Compiler, Tailwind 4
- Python execution: Pyodide 314.0.7 (Python 3.14) in a Web Worker — version in `src/modules/runner/constants.ts` AND the `pyodide` devDependency
- Database / storage: Supabase Postgres (RLS), Realtime for live sync; localStorage for guest mode + offline cache
- Hosting / infra: Vercel; GitHub Actions CI
- Auth: Supabase Auth (email+password, magic link) via `@supabase/ssr`
- AI: Anthropic `claude-opus-5-5` via `@anthropic-ai/sdk` (adapter: `src/modules/tutor/anthropic.ts`)

## Commands

```bash
npm ci                 # install
npm run dev            # run locally (guest-only without env vars)
npm test               # unit + content tests (content tests load Pyodide; first run downloads wheels)
npm run test:e2e       # Playwright; run `npm run build` first
npm run lint && npm run format:check
npm run typecheck
npm run check          # everything CI runs except e2e
npm run screenshots    # regenerate README images (after npm run build)
```

Migrations: `supabase/migrations/*.sql` (apply via Supabase CLI or dashboard).

## Structure

See README "Project structure". Domain logic is pure and lives in `src/modules/*`; React components are thin.

## Conventions specific to this project

- Curriculum content is typed data in `src/modules/curriculum/content/NN-*.ts`. Use the `py` tag for Python source (keeps backslashes literal and dedents). Every code exercise needs: a solution that passes all tests, a starter that fails, ≥1 visible test, hints and an explanation — `tests/content` enforces this in real Pyodide.
- Never put backticks inside `py` template literals; build them in Python (`chr(96) * 3`).
- Progress stores **facts only**; XP/levels/badges are derived (`gamification.ts`). If you change merge rules, change `merge.ts` and the `upsert_exercise_progress` SQL together.
- Errors from API routes use RFC 9457 problem details (`src/shared/http.ts`).
- Anything reading the current date in a client component uses `useToday()` (prerender-safe).

## Deviations from the playbook

- CSP allows `'unsafe-inline'` scripts — ADR 0003.
- Security headers live in `next.config.ts` rather than `vercel.json` (same effect on Vercel; keeps CSP next to the env it depends on).
- No liveness/readiness split: `/api/health` only — serverless, no long-lived process.
- No error tracker yet — see docs/security-review.md.

## Gotchas

- `cacheComponents` is on: no `dynamicParams`/route segment config; `new Date()` in client components breaks prerender (use `useToday`).
- `upgrade-insecure-requests` is only sent on Vercel (it breaks plain-HTTP localhost e2e).
- Lint enforces `react-hooks/set-state-in-effect`; load external stores (localStorage) inside async effect bodies.
- `next dev` rewrites `AGENTS.md`; it's gitignored.

## Sensitive areas

- Auth: `src/shared/supabase/*`, `src/app/auth/*`, `proxy.ts`, `src/app/login/*`.
- RLS policies & SQL functions in `supabase/migrations`.
- AI cost/abuse controls: `src/modules/tutor/guard.ts`, `consume_ai_quota`.
