/** Single source of truth for the Pyodide build. Keep in sync with the `pyodide` devDependency. */
export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const RUN_TIMEOUT_MS = 15_000;
/** Packages learners may request; anything else is rejected before reaching the worker. */
export const ALLOWED_PACKAGES = ["numpy", "pydantic"] as const;
