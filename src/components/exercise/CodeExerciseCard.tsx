"use client";

import {
  Bot,
  CheckCircle2,
  Eye,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useState } from "react";
import { RichText } from "@/components/RichText";
import { TutorPanel } from "@/components/tutor/TutorPanel";
import type { CodeExercise } from "@/modules/curriculum";
import { baseXp } from "@/modules/progress/gamification";
import { useProgress } from "@/modules/progress/ProgressProvider";
import {
  getRunner,
  RunTimeoutError,
  type RunnerStatus,
} from "@/modules/runner/client";
import type { RunOutput } from "@/modules/runner/harness";
import { DifficultyBadge } from "./DifficultyBadge";

const CodeEditor = dynamic(
  () => import("./CodeEditor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="border-line bg-sunken h-[180px] animate-pulse rounded-lg border"
        aria-label="Loading editor"
      />
    ),
  },
);

/** Revealing the solution before solving costs as much XP as three hints. */
const SOLUTION_HINT_COST = 3;
const SOLUTION_UNLOCK_ATTEMPTS = 2;

export function CodeExerciseCard({
  exercise,
  index,
}: {
  exercise: CodeExercise;
  index: number;
}) {
  const { state, attempt, takeHint, saveCode } = useProgress();
  const record = state.exercises[exercise.id];
  const completed = record?.status === "completed";
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const code = editedCode ?? record?.code ?? exercise.starter;
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>("idle");
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const id = useId();

  const hintsVisible = Math.max(
    hintsShown,
    Math.min(record?.hintsUsed ?? 0, exercise.hints.length),
  );

  useEffect(() => getRunner().subscribe(setRunnerStatus), []);
  useEffect(() => {
    // Start downloading Python in the background so the first run is fast.
    const handle = setTimeout(
      () =>
        void getRunner()
          .warmUp()
          .catch(() => {}),
      500,
    );
    return () => clearTimeout(handle);
  }, []);

  const onChange = useCallback(
    (value: string) => {
      setEditedCode(value);
      saveCode(exercise.id, value);
    },
    [exercise.id, saveCode],
  );

  const runTests = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRunError(null);
    try {
      const result = await getRunner().run(
        code,
        exercise.tests,
        exercise.packages,
      );
      setOutput(result);
      const passed =
        result.error === null &&
        result.results.length === exercise.tests.length &&
        result.results.every((r) => r.passed);
      attempt(exercise.id, passed, code);
    } catch (err) {
      setOutput(null);
      setRunError(
        err instanceof RunTimeoutError
          ? err.message
          : `Couldn't run Python: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (err instanceof RunTimeoutError) attempt(exercise.id, false, code);
    } finally {
      setRunning(false);
    }
  }, [running, code, exercise, attempt]);

  function revealHint() {
    if (hintsVisible >= exercise.hints.length) return;
    setHintsShown(hintsVisible + 1);
    takeHint(exercise.id);
  }

  function revealSolution() {
    setShowSolution(true);
    if (!completed) {
      for (let used = record?.hintsUsed ?? 0; used < SOLUTION_HINT_COST; used++)
        takeHint(exercise.id);
    }
  }

  function reset() {
    setEditedCode(exercise.starter);
    saveCode(exercise.id, exercise.starter);
    setOutput(null);
    setRunError(null);
  }

  const allPassed =
    output && output.error === null && output.results.every((r) => r.passed);
  const canRevealSolution =
    completed || (record?.attempts ?? 0) >= SOLUTION_UNLOCK_ATTEMPTS;
  const statusText =
    runnerStatus === "loading"
      ? "Loading Python… (first run takes a few seconds)"
      : runnerStatus === "error"
        ? "Python failed to load — check your connection and try again."
        : null;

  return (
    <article
      aria-labelledby={`${id}-title`}
      className={`bg-elevated rounded-xl border p-5 ${completed ? "border-success/50" : "border-line"}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 id={`${id}-title`} className="font-semibold">
          {index}. {exercise.title}
        </h3>
        <DifficultyBadge difficulty={exercise.difficulty} />
        <span className="text-muted ml-auto text-xs">
          {baseXp(exercise)} XP
          {record && !completed && record.attempts > 0
            ? ` · ${record.attempts} attempt${record.attempts === 1 ? "" : "s"}`
            : ""}
        </span>
        {completed && (
          <CheckCircle2
            aria-label="Completed"
            className="text-success h-5 w-5"
          />
        )}
      </header>

      <p className="mt-3 text-sm leading-relaxed">
        <RichText text={exercise.prompt} />
      </p>

      <div className="mt-4">
        <CodeEditor
          value={code}
          onChange={onChange}
          onRun={runTests}
          label={`Code editor for ${exercise.title}`}
        />
        <p className="text-muted mt-1 text-xs">
          Ctrl/⌘ + Enter runs the tests · Esc then Tab leaves the editor
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runTests}
          disabled={running}
          className="bg-brand-solid hover:bg-brand-solid-hover inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {running ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Play aria-hidden="true" className="h-4 w-4" />
          )}
          {running ? "Running…" : "Run tests"}
        </button>
        <button
          type="button"
          onClick={revealHint}
          disabled={hintsVisible >= exercise.hints.length}
          className="border-line hover:bg-sunken inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <Lightbulb aria-hidden="true" className="text-accent h-4 w-4" />
          Hint {hintsVisible}/{exercise.hints.length}
          {!completed && <span className="text-muted text-xs">(−20% XP)</span>}
        </button>
        <button
          type="button"
          onClick={() => setTutorOpen((o) => !o)}
          aria-expanded={tutorOpen}
          className="border-line hover:bg-sunken inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
        >
          <Bot aria-hidden="true" className="h-4 w-4 text-[var(--track-ai)]" />{" "}
          Ask the tutor
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-muted hover:text-fg ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" /> Reset
        </button>
      </div>

      {statusText && (
        <p role="status" className="text-muted mt-2 text-xs">
          {statusText}
        </p>
      )}

      {hintsVisible > 0 && (
        <ol className="mt-4 space-y-2">
          {exercise.hints.slice(0, hintsVisible).map((h, i) => (
            <li
              key={i}
              className="border-accent/30 bg-accent/5 flex gap-2 rounded-lg border p-3 text-sm"
            >
              <Lightbulb
                aria-hidden="true"
                className="text-accent mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                <span className="sr-only">Hint {i + 1}: </span>
                <RichText text={h} />
              </span>
            </li>
          ))}
        </ol>
      )}

      <div aria-live="polite" className="mt-4 space-y-3">
        {runError && (
          <p
            role="alert"
            className="border-danger/50 bg-danger/10 text-danger rounded-lg border p-3 text-sm"
          >
            {runError}
          </p>
        )}
        {output?.error && (
          <pre className="border-danger/50 bg-danger/10 text-danger overflow-x-auto rounded-lg border p-3 text-sm">
            {output.error}
          </pre>
        )}
        {output && output.results.length > 0 && (
          <div>
            <p
              className={`text-sm font-semibold ${allPassed ? "text-success" : "text-fg"}`}
            >
              {allPassed
                ? "All tests passed! 🎉"
                : `${output.results.filter((r) => r.passed).length}/${output.results.length} tests passed`}
            </p>
            <ul className="mt-2 space-y-1">
              {output.results.map((r, i) => {
                const hidden = exercise.tests[i]?.hidden && !r.passed;
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {r.passed ? (
                      <CheckCircle2
                        aria-label="passed"
                        className="text-success mt-0.5 h-4 w-4 shrink-0"
                      />
                    ) : (
                      <XCircle
                        aria-label="failed"
                        className="text-danger mt-0.5 h-4 w-4 shrink-0"
                      />
                    )}
                    <span>
                      {hidden ? "Hidden test (edge case)" : r.name}
                      {!r.passed && r.error && !hidden && (
                        <span className="text-muted block font-mono text-xs">
                          {r.error}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {output?.stdout && (
          <div>
            <p className="text-muted text-xs tracking-wide uppercase">Output</p>
            <pre className="bg-sunken mt-1 max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs">
              {output.stdout}
            </pre>
          </div>
        )}
      </div>

      {completed && (
        <div className="border-success/40 bg-success/5 mt-4 rounded-lg border p-4 text-sm">
          <p className="text-success font-semibold">Why this works</p>
          <p className="mt-1 leading-relaxed">
            <RichText text={exercise.explanation} />
          </p>
        </div>
      )}

      {canRevealSolution && (
        <div className="mt-4">
          {!showSolution ? (
            <button
              type="button"
              onClick={revealSolution}
              className="text-muted hover:text-fg inline-flex items-center gap-1.5 text-sm"
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              {completed
                ? "Compare with the reference solution"
                : "Show solution (costs 3 hints of XP)"}
            </button>
          ) : (
            <div>
              <p className="text-muted text-xs tracking-wide uppercase">
                Reference solution
              </p>
              <pre className="border-line bg-sunken mt-1 overflow-x-auto rounded-lg border p-3 font-mono text-sm">
                {exercise.solution}
              </pre>
            </div>
          )}
        </div>
      )}

      {tutorOpen && (
        <TutorPanel
          exercise={exercise}
          code={code}
          lastResult={output}
          onClose={() => setTutorOpen(false)}
        />
      )}
    </article>
  );
}
