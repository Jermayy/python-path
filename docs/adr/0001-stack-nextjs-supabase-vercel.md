# 0001 · Next.js 16 + Supabase + Vercel

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The spec requires a TypeScript/Next.js UI hosted on Vercel, accounts that sync progress across browsers, and live syncing. The playbook leaves the default database and auth provider open.

## Options considered

1. **Supabase (Auth + Postgres + Realtime)** — one vendor for auth, relational data with RLS and live change feeds; precedent in canvas-studio. Cons: free tier limited to 2 active projects per owner.
2. **Neon + Better Auth** — Vercel Marketplace Postgres, self-hosted auth library. Cons: more auth code to own; live sync needs polling/SSE.
3. **Clerk + Neon** — polished managed auth. Cons: two vendors, still no realtime.

## Decision

Supabase, chosen with the project owner. Next.js 16 App Router with Cache Components so curriculum pages prerender statically; Vercel for hosting (playbook decision 0003).

## Consequences

- Authorisation lives in Postgres RLS; every table must have policies (checked by Supabase advisors).
- The app runs in **guest-only mode** when Supabase env vars are absent (used by CI/e2e).
- Reversal: progress is plain rows behind a `RemoteProgressStore` adapter; swapping providers means a new adapter + auth UI.
