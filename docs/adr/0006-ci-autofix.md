# 0006 · CI with risk-rated findings and bounded AI autofix

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The owner wants CI that rates bugs/vulnerabilities by risk and effort and auto-fixes small ones (≤ 100 changed lines) on the same PR branch, with `main` protected.

## Decision

- `ci.yml`: npm ci → format → lint → typecheck → unit + content tests → build → Playwright (Chromium + mobile).
- `security.yml`: gitleaks, `npm audit --audit-level=high`, dependency review, CodeQL.
- `autofix.yml`: when CI or Security fails on a PR **from this repository**, the Claude Code GitHub Action triages the failure, writes a risk × effort table as a PR comment, and commits a fix to the PR branch only if it is ≤ 100 changed lines and doesn't touch workflows, migrations, auth or secrets. Larger/riskier fixes are only reported.
- Fork PRs never trigger autofix (no secrets exposed to untrusted code). Autofix commits are made with the workflow token, which by design does not re-trigger workflows; a maintainer re-runs checks (or pushes) before merge, and human review is required to merge.
- `main` protected by a ruleset: changes only via PR, required status checks must pass, no force-push or deletion. Required approvals is 0 because this is a solo-maintainer repo (GitHub doesn't let authors approve their own PRs); raise it to 1 when a second maintainer joins.

## Consequences

- Needs `ANTHROPIC_API_KEY` as a repository secret (added by the owner).
- AI-authored commits are always reviewed before merge; the bot cannot merge.
