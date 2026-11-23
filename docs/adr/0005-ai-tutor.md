# 0005 · AI tutor and adaptive coach via Anthropic API

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

Optional features requested: an AI chatbot for exercise questions and an agent that adapts difficulty and gives hints. A web-trends scanner was deferred to v2 by the owner.

## Decision

- `/api/tutor` streams replies; `/api/coach` returns structured output (`hint`, `difficulty`, `encouragement`) validated by zod via `betaZodOutputFormat`.
- Model `claude-opus-5-5` at effort `low` (chat-style latency); server-side refusal fallbacks enabled (`fallbacks: "default"`). Stable system prompts are prompt-cached.
- Signed-in users only; guarded in order: same-origin + JSON → configured → verified JWT (`getClaims`) → zod validation → atomic daily quota in Postgres (`consume_ai_quota`, default 40/day) → model call.
- Learner content is delimited (`<learner_code>` etc.) and the system prompt treats it as data. The model has **no tools**, so prompt injection can at worst produce a bad answer to the injecting user.
- A deterministic rule-based coach (`coach.ts`) works offline and for guests.

## Consequences

- Cost is bounded by `AI_DAILY_LIMIT × users`. Set a billing alert on the Anthropic account.
- Learner code and questions are sent to Anthropic (disclosed on /privacy). Email is never sent.
- Reversal: the adapter (`modules/tutor/anthropic.ts`) is the only file that talks to the provider.
