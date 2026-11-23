# Security Policy

## Reporting a vulnerability

Please **don't open a public issue**. Use GitHub's private vulnerability reporting:
**Security → Report a vulnerability** on this repository.

Include details and steps to reproduce. You'll get an acknowledgement within 5 business days and updates as it's investigated.

## Supported versions

| Version         | Supported |
| --------------- | --------- |
| latest (`main`) | ✅        |

## Scope notes

- Learner Python code runs only in the visitor's own browser (Pyodide/WebAssembly in a Web Worker). It is never executed server-side.
- See [docs/security-review.md](docs/security-review.md) for the current threat model and accepted risks.
