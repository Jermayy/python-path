/* Classic worker: loads Pyodide from the pinned CDN build and runs learner code in isolation.
   The page terminates this worker on timeout, so infinite loops can't freeze the UI. */
"use strict";

// Only the pinned jsDelivr Pyodide build may be loaded (defence in depth: the page controls this value).
const ALLOWED_INDEX_URL =
  /^https:\/\/cdn\.jsdelivr\.net\/pyodide\/v\d+\.\d+\.\d+\/full\/$/;

let pyodideReady = null;
const loadedPackages = new Set();

function init(indexURL, harness) {
  if (typeof indexURL !== "string" || !ALLOWED_INDEX_URL.test(indexURL)) {
    return Promise.reject(
      new Error("Refusing to load Pyodide from an unexpected URL"),
    );
  }
  if (typeof harness !== "string")
    return Promise.reject(new Error("Invalid harness"));
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
  // Dedicated workers only receive messages from the page that created them; the origin is
  // empty in that case. Reject anything else, and anything that isn't a well-formed message.
  if (event.origin && event.origin !== self.location.origin) return;
  const msg = event.data;
  if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;
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
