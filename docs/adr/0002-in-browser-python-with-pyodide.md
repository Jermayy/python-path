# 0002 · Run learner Python in the browser with Pyodide

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

Exercises must execute real Python with tests. Running untrusted code on our servers needs sandboxing (containers/microVMs), costs money per run and is a significant attack surface.

## Options considered

1. **Pyodide (CPython → WebAssembly) in a Web Worker** — free, no server attack surface, includes numpy/pydantic/sqlite3. Cons: ~10 MB first download, no real network/filesystem, CPython 3.14 only.
2. **Server sandbox (Vercel Sandbox / Firecracker)** — full Python, any package. Cons: cost per run, latency, abuse risk.

## Decision

Pyodide `314.0.7` (Python 3.14) loaded from jsDelivr in a classic Web Worker (`public/workers/pyodide-worker.js`). The worker is terminated after 15 s so infinite loops can't freeze the tab. The same Python harness (`src/modules/runner/harness.ts`) runs in CI under Node Pyodide to verify every reference solution passes and every starter fails.

## Consequences

- Topics that need real infrastructure (FastAPI servers, vector DBs, LLM calls) are taught with in-browser simulations (mini router, NumPy vector index, scripted fake LLMs) plus reference code.
- CSP must allow `https://cdn.jsdelivr.net` and `'wasm-unsafe-eval'` (ADR 0003).
- Version bumps: change `PYODIDE_VERSION` and the `pyodide` devDependency together; CI content tests catch breakage.
- Learners can read reference solutions in the JS bundle — acceptable for a self-study tool where cheating only hurts the learner.
