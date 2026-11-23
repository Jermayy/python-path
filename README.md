# Python Path

**From zero Python to a hired Forward Deployed / AI Orchestration Engineer.** A gamified, browser-based curriculum: 14 modules, 59 exercises (48 runnable Python coding exercises with hidden tests, plus quizzes), a visual roadmap, XP/levels/streaks/badges, accounts with live cross-device sync, guest mode, and an optional AI tutor.

Built for learners coming from Dart/Flutter and TypeScript — every early lesson shows the Dart/TS equivalent.

## Curriculum

| Track                | Modules                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Foundations          | Python Basics · Collections & Comprehensions · Problem Solving Patterns (LeetCode-style)                     |
| Engineering          | Idiomatic Python · Types, Tests & Tooling                                                                    |
| Backend & Full-stack | Data, SQL & APIs (Pydantic, sqlite, REST) · Async & Reliable Integrations · Python backends for TS frontends |
| AI Engineering       | LLM Foundations · Embeddings, Vectors & RAG · Agents & Orchestration · Evals · Model Training & Fine-tuning  |
| Career               | Production, Interviews & Capstone                                                                            |

The curriculum is reverse-engineered from a hiring bar (see `/hiring-bar` in the app and `src/modules/curriculum/hiring-bar.ts`).

## Quick start

Requires Node 24 (pinned in `.nvmrc` / Volta).

```bash
npm ci
cp .env.example .env.local   # optional: leave blank for guest-only mode
npm run dev                  # http://localhost:3000
```

With no environment variables the app runs in **guest-only mode**: everything works and progress is stored in the browser. Add Supabase keys for accounts/sync and an Anthropic key for the AI tutor.

## Commands

| Command            | What it does                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| `npm run dev`      | Dev server                                                              |
| `npm run check`    | Format check, lint, typecheck, unit + content tests, build (CI gate)    |
| `npm test`         | Vitest: unit tests + **content tests** (runs every exercise in Pyodide) |
| `npm run test:e2e` | Playwright (builds must exist: `npm run build` first)                   |
| `npm run format`   | Prettier write                                                          |

## Environment variables

See [.env.example](.env.example). `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both or neither), `ANTHROPIC_API_KEY` (server-only), `AI_DAILY_LIMIT` (default 40).

## Database

Supabase Postgres. Schema and RLS policies are in [`supabase/migrations`](supabase/migrations) (apply with `npx supabase db push` or the dashboard SQL editor). Every table has RLS; progress writes go through a merge-safe RPC.

## Project structure

```
src/
  app/                  routes (App Router): landing, roadmap, dashboard, learn/[module]/[lesson], login, api/*
  components/           UI (exercise cards, tutor panel, header, progress primitives)
  modules/
    curriculum/         content + types (pure data)
    runner/             Pyodide harness + worker client
    progress/           actions, merge (CRDT), gamification, coach, sync provider
    tutor/              AI schemas, prompts, Anthropic adapter, request guard
  shared/               config, logger, http helpers, Supabase clients
public/workers/         Pyodide Web Worker
supabase/migrations/    SQL schema
tests/{unit,content,e2e}
docs/                   architecture, ADRs, security review
```

## Deploying

Vercel, connected to this repo (preview per PR, production on merge to `main`). Set the env vars in the Vercel project. Rollback: promote the previous deployment in Vercel. Health check: `GET /api/health`.

## Contributing

`main` is protected: all changes go through PRs with green CI. See [docs/adr/0006-ci-autofix.md](docs/adr/0006-ci-autofix.md) for the automated triage/fix bot.

Security issues: see [SECURITY.md](SECURITY.md).
