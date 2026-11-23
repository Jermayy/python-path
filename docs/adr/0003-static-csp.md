# 0003 · Static CSP with 'unsafe-inline' scripts

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The playbook says to set a CSP and avoid inline scripts, allowing them by hash, or `'unsafe-inline'` only with an ADR. Next.js emits inline bootstrap scripts. Nonce-based CSP forces every page to render dynamically and is incompatible with Partial Prerendering, which we rely on for fast static lesson pages.

## Options considered

1. **Nonces via proxy** — strongest. Cons: disables static rendering/PPR; every lesson becomes a server render.
2. **Experimental SRI (hash-based)** — keeps static rendering. Cons: experimental; covers external chunks, not every inline bootstrap script.
3. **Static header with `'unsafe-inline'`** — simple, cacheable.

## Decision

Option 3, in `next.config.ts`: `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net`, plus `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and a `connect-src` limited to self, jsDelivr and the configured Supabase host.

## Remaining risk & mitigations

`'unsafe-inline'` means an HTML-injection bug could execute script. Mitigations: React auto-escaping everywhere; no `dangerouslySetInnerHTML` (curriculum text is rendered by `RichText` into React nodes); no user-generated HTML; `connect-src` limits exfiltration targets; session cookies are managed by Supabase SSR.

## Revisit

When Next.js ships stable hash-based CSP compatible with PPR, or if the app ever renders user-generated rich content.
