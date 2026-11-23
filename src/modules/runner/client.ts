"use client";

import type { CodeTest } from "@/modules/curriculum";
import {
  ALLOWED_PACKAGES,
  PYODIDE_INDEX_URL,
  RUN_TIMEOUT_MS,
} from "./constants";
import { HARNESS_PY, parseRunOutput, type RunOutput } from "./harness";

export type RunnerStatus = "idle" | "loading" | "ready" | "running" | "error";

type Pending = {
  resolve: (o: RunOutput) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class RunTimeoutError extends Error {
  constructor() {
    super(
      `Your code ran for more than ${RUN_TIMEOUT_MS / 1000}s — is there an infinite loop?`,
    );
    this.name = "RunTimeoutError";
  }
}

/** Owns the Pyodide worker. Restarts it after timeouts so a runaway loop can't wedge the page. */
class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private listeners = new Set<(s: RunnerStatus) => void>();
  status: RunnerStatus = "idle";

  subscribe(fn: (s: RunnerStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: RunnerStatus) {
    this.status = s;
    this.listeners.forEach((fn) => fn(s));
  }

  warmUp(): Promise<void> {
    if (this.ready) return this.ready;
    this.setStatus("loading");
    const worker = new Worker("/workers/pyodide-worker.js");
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent) => {
        const msg = event.data as {
          type: string;
          id?: number;
          raw?: string;
          message?: string;
        };
        if (msg.type === "ready") {
          this.setStatus("ready");
          resolve();
          return;
        }
        const entry =
          msg.id !== undefined ? this.pending.get(msg.id) : undefined;
        if (msg.type === "error" && !entry) {
          this.setStatus("error");
          reject(new Error(msg.message ?? "Python runtime failed to load"));
          return;
        }
        if (!entry || msg.id === undefined) return;
        clearTimeout(entry.timer);
        this.pending.delete(msg.id);
        if (this.pending.size === 0) this.setStatus("ready");
        if (msg.type === "result" && msg.raw)
          entry.resolve(parseRunOutput(msg.raw));
        else entry.reject(new Error(msg.message ?? "Python run failed"));
      };
      worker.onerror = (e) => {
        this.setStatus("error");
        reject(new Error(e.message || "Python worker crashed"));
      };
    });
    worker.postMessage({
      type: "init",
      indexURL: PYODIDE_INDEX_URL,
      harness: HARNESS_PY,
    });
    // Allow a retry if loading fails (e.g. offline).
    this.ready.catch(() => this.reset());
    return this.ready;
  }

  private reset() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Python runtime restarted"));
    }
    this.pending.clear();
  }

  async run(
    code: string,
    tests: CodeTest[],
    packages: string[] = [],
  ): Promise<RunOutput> {
    const safePackages = packages.filter(
      (p): p is (typeof ALLOWED_PACKAGES)[number] =>
        (ALLOWED_PACKAGES as readonly string[]).includes(p),
    );
    await this.warmUp();
    const worker = this.worker;
    if (!worker) throw new Error("Python runtime is not available");
    const id = this.nextId++;
    this.setStatus("running");
    return new Promise<RunOutput>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.reset();
        this.setStatus("idle");
        reject(new RunTimeoutError());
      }, RUN_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      worker.postMessage({
        type: "run",
        id,
        code,
        tests,
        packages: safePackages,
      });
    });
  }
}

let runner: PythonRunner | null = null;

export function getRunner(): PythonRunner {
  runner ??= new PythonRunner();
  return runner;
}
