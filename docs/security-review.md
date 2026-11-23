# Security review & threat model

Date: 2026-11-23 · Scope: whole application at initial release · Baseline: OWASP ASVS L1 (L2 for personal data).

## Assets & trust boundaries

- **Assets:** user accounts (email), learning progress + saved code, Anthropic API budget, Supabase credentials.
- **Boundaries:** browser ↔ Vercel route handlers; browser ↔ Supabase (publishable key + RLS); Vercel ↔ Anthropic; browser ↔ jsDelivr (Pyodide).

## Controls in place

| Area             | Control                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorisation    | RLS on every table, `auth.uid()` checks; writes via `security invoker` RPC; quota via `security definer` RPC with fixed `search_path`; anon has no execute grants     |
| Authentication   | Supabase Auth; server verifies JWT with `getClaims()`; generic login errors; 10-char minimum password; session refresh in `proxy.ts`                                  |
| Input validation | zod schemas with size limits on all API bodies; 64 KB body cap; DB check constraints (id format, code ≤ 20 000 chars, counters bounded)                               |
| CSRF             | AI routes require `application/json` + same-origin (`Sec-Fetch-Site` / `Origin`)                                                                                      |
| Open redirect    | `safeNextPath()` on auth callback + login (`//`, `/\`, control chars rejected; e2e tested)                                                                            |
| Code execution   | Learner Python runs only in the browser worker; 15 s timeout + worker restart; package allow-list                                                                     |
| AI abuse / cost  | Signed-in only; atomic per-user daily quota (default 40); `max_tokens` caps; 60 s timeout; no tools given to the model; learner content delimited and treated as data |
| Headers          | CSP, nosniff, Referrer-Policy, frame-ancestors none / XFO DENY, Permissions-Policy, HSTS, COOP; `x-powered-by` removed                                                |
| Errors & logs    | Problem-details responses without internals; JSON logs with key-based redaction; user ids only (UUID), never email                                                    |
| Supply chain     | Lockfile + `npm ci`; actions pinned by SHA; Dependabot (no toolchain majors); `npm audit`, dependency review, CodeQL, gitleaks                                        |

## Findings flagged for correction (risk × effort)

| #   | Finding                                                                                                                                           | Risk                  | Effort | Status                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pyodide loaded from a third-party CDN without integrity checks (`importScripts` can't use SRI). A compromised CDN could run script in the worker. | Medium                | M      | **Open** — self-host the pinned Pyodide build under `/public/pyodide` and drop jsDelivr from CSP                                    |
| 2   | CSP permits `'unsafe-inline'` scripts                                                                                                             | Medium                | L      | Accepted — ADR 0003                                                                                                                 |
| 3   | Unlimited sign-ups could multiply AI spend (quota is per user)                                                                                    | Medium                | S      | **Action for owner:** keep email confirmation ON, set an Anthropic workspace spend limit + billing alert, consider Supabase CAPTCHA |
| 4   | Supabase default SMTP is heavily rate-limited (confirmation / magic-link emails will stall beyond a few per hour)                                 | Medium (availability) | S      | **Action for owner:** configure custom SMTP in Supabase Auth settings                                                               |
| 5   | Leaked-password protection and MFA not enabled                                                                                                    | Low                   | S      | **Action for owner:** enable in Supabase Auth settings (leaked-password check may need Pro)                                         |
| 6   | Progress is self-reported (tests run client-side)                                                                                                 | Low                   | L      | Accepted — ADR 0004; revisit if leaderboards are added                                                                              |
| 7   | No self-service account deletion (privacy: right to erasure)                                                                                      | Low                   | M      | Open — progress reset exists; add account deletion via a server route using the service role                                        |
| 8   | Saved code drafts might contain secrets a learner pastes                                                                                          | Low                   | S      | Mitigated by privacy notice; consider client-side secret pattern warning                                                            |
| 9   | No error tracker (unhandled client/server errors only in Vercel logs)                                                                             | Low                   | S      | Open — add Sentry with release tags                                                                                                 |
| 10  | Reference solutions ship in the client bundle                                                                                                     | Info                  | —      | Accepted — self-study tool                                                                                                          |

## Re-review triggers

New auth flows, leaderboards/social features, server-side code execution, giving the AI model tools, or storing new categories of personal data.
