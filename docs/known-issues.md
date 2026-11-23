# Known issues

- **CodeMirror syntax colours** (third-party `dark` theme) have some tokens below 4.5:1 contrast and the editor stays dark in light mode. Excluded from the axe e2e scan; fix with a custom highlight style.
- **First run downloads ~10 MB** of Pyodide (cached by the browser afterwards). Offline first-run therefore can't execute code.
- **Safari may clear guest-mode progress** after 7 days without a visit (script-written storage eviction). Sign in to keep it safe; the privacy page says so.
