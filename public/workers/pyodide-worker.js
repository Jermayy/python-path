/* Classic worker: loads Pyodide from the pinned CDN build and runs learner code in isolation.
   The page terminates this worker on timeout, so infinite loops can't freeze the UI. */
"use strict";

let pyodideReady = null;
const loadedPackages = new Set();

function init(indexURL, harness) {
  if (!pyodideReady) {
    pyodideReady = (async () => {
      importScripts(indexURL + "pyodide.js");
      const py = await loadPyodide({ indexURL });
      await py.runPythonAsync(harness);
      return py;
    })();
  }
  return pyodideReady;
}

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === "init") {
      await init(msg.indexURL, msg.harness);
      self.postMessage({ type: "ready" });
      return;
    }
    if (msg.type === "run") {
      const py = await pyodideReady;
      const missing = (msg.packages || []).filter(
        (p) => !loadedPackages.has(p),
      );
      if (missing.length) {
        await py.loadPackage(missing, { messageCallback: () => {} });
        missing.forEach((p) => loadedPackages.add(p));
      }
      const run = py.globals.get("_pp_run");
      try {
        const raw = await run(msg.code, JSON.stringify(msg.tests));
        self.postMessage({ type: "result", id: msg.id, raw });
      } finally {
        run.destroy();
      }
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      id: msg.id,
      message: String((err && err.message) || err),
    });
  }
};
