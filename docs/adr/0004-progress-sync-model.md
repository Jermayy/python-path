# 0004 · Progress as mergeable facts with a local-first outbox

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

Requirements: guest mode, accounts that sync across browsers, live sync after each exercise, and no lost progress when offline or using two devices.

## Decision

- Store **facts only** per exercise (status, attempts, hints, completedAt, latest code, updatedAt) plus activity days. XP/levels/badges are derived in code.
- Merge is a state-based CRDT: completed wins; max attempts/hints; earliest completion; newest code (deterministic tie-break). Implemented in `merge.ts` and mirrored in the `upsert_exercise_progress` SQL function.
- Writes go to localStorage synchronously, then to a persisted outbox flushed to Supabase with exponential backoff. Supabase Realtime pushes changes to other sessions.
- On sign-in, guest progress can be imported (merged) explicitly.

## Consequences

- Progress is **self-reported**: tests run client-side, so a user could mark their own exercises complete. Accepted: there is no leaderboard or competitive element; only the user's own data is affected (RLS). Revisit if leaderboards are added (would require server-side verification).
- XP formula changes never need data migrations.
- The SQL and TS merge must stay in sync (unit tests cover the TS side; the SQL comment points to it).
