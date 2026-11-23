# Architecture

Python Path is a **modular monolith**: one Next.js 16 app (App Router, Cache Components) on Vercel, with Supabase for auth and progress storage and Anthropic for the optional AI tutor.

```mermaid
flowchart LR
  subgraph Browser
    UI[Next.js UI<br/>React 19]
    PS[ProgressProvider<br/>state + outbox]
    LS[(localStorage<br/>guest + cache)]
    W[Web Worker<br/>Pyodide / Python 3.14]
  end
  subgraph Vercel
    SSG[Static pages<br/>curriculum prerendered]
    API[/api/tutor · /api/coach<br/>route handlers/]
    PX[proxy.ts<br/>session refresh]
  end
  SB[(Supabase<br/>Auth + Postgres + Realtime<br/>RLS on every table)]
  AN[Anthropic API<br/>claude-opus-5-5]
  CDN[jsDelivr<br/>Pyodide build]

  UI --> PS --> LS
  UI -- run code --> W -- loads --> CDN
  PS -- upsert_exercise_progress RPC --> SB
  SB -- realtime changes --> PS
  UI --> API -- getClaims + consume_ai_quota --> SB
  API -- stream --> AN
  UI --- SSG
  PX --- SB
```

## Modules (`src/modules`)

| Module       | Responsibility                                                                                |
| ------------ | --------------------------------------------------------------------------------------------- |
| `curriculum` | Pure data: modules → lessons → content blocks + exercises (with tests, hints, solutions).     |
| `runner`     | Python harness (shared with tests), Pyodide worker client with timeouts and restart.          |
| `progress`   | Facts (`ExerciseProgress`), pure actions, CRDT-style merge, gamification, coach, sync engine. |
| `tutor`      | Request schemas, prompts, Anthropic adapter, auth/CSRF/quota guard for AI routes.             |

`src/shared` holds config (validated with zod), logging (JSON + redaction), HTTP helpers (RFC 9457) and Supabase clients.

## Data flow: completing an exercise

1. Worker runs learner code + tests; returns per-test results.
2. `recordAttempt` (pure) produces the new state; `commit` writes it to React state **and localStorage synchronously**.
3. For signed-in users the record is added to a persisted **outbox**, then flushed via the `upsert_exercise_progress` RPC.
4. The RPC merges with the same rules as `merge.ts` (completed wins, max attempts/hints, earliest completion, newest code), so concurrent devices converge.
5. Supabase Realtime pushes the row to other open sessions, which merge it in.

XP, levels, streaks and badges are **derived** from the stored facts — never stored — so changing the XP formula never requires a migration.

## Key decisions

See [docs/adr](adr/).
