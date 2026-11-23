/**
 * Content integrity: every exercise's reference solution must pass all its tests in real
 * Pyodide (same runtime as the browser), and every starter must fail at least one —
 * otherwise the exercise is broken or trivially solved.
 */
import { loadPyodide, type PyodideAPI } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import { allExercises, modules, type CodeExercise } from "@/modules/curriculum";
import {
  HARNESS_PY,
  parseRunOutput,
  type RunOutput,
} from "@/modules/runner/harness";

let pyodide: PyodideAPI;

beforeAll(async () => {
  pyodide = await loadPyodide();
  await pyodide.loadPackage(["numpy", "pydantic"], {
    messageCallback: () => {},
  });
  await pyodide.runPythonAsync(HARNESS_PY);
});

async function run(code: string, ex: CodeExercise): Promise<RunOutput> {
  const fn = pyodide.globals.get("_pp_run");
  try {
    const raw = (await fn(code, JSON.stringify(ex.tests))) as string;
    return parseRunOutput(raw);
  } finally {
    fn.destroy();
  }
}

const codeExercises = allExercises
  .map((r) => r.exercise)
  .filter((e): e is CodeExercise => e.kind === "code");

describe("curriculum structure", () => {
  it("has unique module and lesson ids", () => {
    const moduleIds = modules.map((m) => m.id);
    expect(new Set(moduleIds).size).toBe(moduleIds.length);
    for (const m of modules) {
      const lessonIds = m.lessons.map((l) => l.id);
      expect(new Set(lessonIds).size, m.id).toBe(lessonIds.length);
    }
  });

  it("every lesson has content and at least one exercise", () => {
    for (const m of modules)
      for (const l of m.lessons) {
        expect(l.content.length, `${m.id}/${l.id}`).toBeGreaterThan(0);
        expect(l.exercises.length, `${m.id}/${l.id}`).toBeGreaterThan(0);
      }
  });

  it("quiz answers point at a real option", () => {
    for (const { exercise } of allExercises) {
      if (exercise.kind !== "quiz") continue;
      expect(exercise.answerIndex, exercise.id).toBeGreaterThanOrEqual(0);
      expect(exercise.answerIndex, exercise.id).toBeLessThan(
        exercise.options.length,
      );
    }
  });

  it("code exercises have hints and at least one visible test", () => {
    for (const ex of codeExercises) {
      expect(ex.hints.length, ex.id).toBeGreaterThan(0);
      expect(
        ex.tests.some((t) => !t.hidden),
        ex.id,
      ).toBe(true);
    }
  });
});

describe.each(codeExercises.map((e) => [e.id, e] as const))(
  "exercise %s",
  (_id, ex) => {
    it("reference solution passes every test", async () => {
      const out = await run(ex.solution, ex);
      expect(out.error).toBeNull();
      const failed = out.results.filter((r) => !r.passed);
      expect(failed, JSON.stringify(failed)).toEqual([]);
      expect(out.results).toHaveLength(ex.tests.length);
    });

    it("starter code does not already pass", async () => {
      const out = await run(ex.starter, ex);
      const allPassed =
        out.error === null && out.results.every((r) => r.passed);
      expect(allPassed).toBe(false);
    });
  },
);
