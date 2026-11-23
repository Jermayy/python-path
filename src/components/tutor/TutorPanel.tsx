"use client";

import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CodeExercise } from "@/modules/curriculum";
import { recommend } from "@/modules/progress/coach";
import { useProgress } from "@/modules/progress/ProgressProvider";
import type { RunOutput } from "@/modules/runner/harness";
import type { CoachResponse } from "@/modules/tutor/schema";

type Msg = { role: "user" | "assistant"; content: string };

const DIFFICULTY_COPY: Record<CoachResponse["difficulty"], string> = {
  easier:
    "Suggestion: revisit the lesson notes or an earlier exercise before moving on.",
  same: "Suggestion: keep going at this level.",
  harder: "Suggestion: you're ready for a hard challenge next.",
};

async function problemMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { title?: string; detail?: string };
    return body.detail ?? body.title ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function TutorPanel({
  exercise,
  code,
  lastResult,
  onClose,
}: {
  exercise: CodeExercise;
  code: string;
  lastResult: RunOutput | null;
  onClose: () => void;
}) {
  const { user, authAvailable, state } = useProgress();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => abortRef.current?.abort();
  }, []);

  if (!user) {
    return (
      <aside
        aria-label="AI tutor"
        className="mt-4 rounded-lg border border-[var(--track-ai)]/40 bg-[var(--track-ai)]/5 p-4 text-sm"
      >
        <p className="flex items-center gap-2 font-semibold">
          <Bot aria-hidden="true" className="h-4 w-4" /> AI tutor
        </p>
        <p className="text-muted mt-1">
          {authAvailable ? (
            <>
              The AI tutor is available to signed-in learners (it costs real
              money to run, so it&apos;s rate-limited per account).{" "}
              <Link
                href="/login"
                className="text-brand hover:text-brand-strong underline"
              >
                Sign in free
              </Link>{" "}
              — your guest progress comes with you.
            </>
          ) : (
            "The AI tutor isn't enabled on this deployment. Use the built-in hints instead."
          )}
        </p>
      </aside>
    );
  }

  const lastRun = lastResult
    ? { error: lastResult.error, results: lastResult.results }
    : null;

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.id,
          code,
          lastRun,
          messages: history.slice(-20),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(await problemMessage(res));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages(history.slice(0, -1));
      setInput(question);
      setError(
        err instanceof Error
          ? err.message
          : "The tutor is unavailable right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function askCoach() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const record = state.exercises[exercise.id];
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.id,
          code,
          attempts: record?.attempts ?? 0,
          hintsUsed: record?.hintsUsed ?? 0,
          failingTests: (lastResult?.results ?? [])
            .filter((r) => !r.passed)
            .map((r) => r.name),
          error: lastResult?.error ?? null,
          recent: recommend(state).signals,
        }),
      });
      if (!res.ok) throw new Error(await problemMessage(res));
      setCoach((await res.json()) as CoachResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The coach is unavailable right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      aria-label="AI tutor"
      className="bg-sunken mt-4 rounded-lg border border-[var(--track-ai)]/40 p-4"
    >
      <div className="flex items-center gap-2">
        <Bot aria-hidden="true" className="h-4 w-4 text-[var(--track-ai)]" />
        <p className="text-sm font-semibold">AI tutor</p>
        <button
          type="button"
          onClick={askCoach}
          disabled={busy}
          className="border-line hover:bg-elevated ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs disabled:opacity-50"
        >
          <Sparkles aria-hidden="true" className="text-accent h-3.5 w-3.5" />{" "}
          Coach me
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tutor"
          className="text-muted hover:text-fg rounded p-1"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {coach && (
        <div className="border-accent/30 bg-accent/5 mt-3 rounded-md border p-3 text-sm">
          <p>{coach.hint}</p>
          <p className="text-muted mt-2 text-xs">
            {coach.encouragement} {DIFFICULTY_COPY[coach.difficulty]}
          </p>
        </div>
      )}

      <div
        className="mt-3 max-h-80 space-y-3 overflow-y-auto"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-muted text-sm">
            Ask anything about this exercise — e.g. &ldquo;why does my test
            fail?&rdquo; or &ldquo;what does <code>enumerate</code> do?&rdquo;
            The tutor sees your code and latest test results, and will nudge
            rather than solve.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-md p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-brand/15 ml-8" : "bg-elevated mr-8"}`}
          >
            <span className="sr-only">
              {m.role === "user" ? "You said:" : "Tutor said:"}
            </span>
            {m.content ||
              (busy && i === messages.length - 1 ? (
                <Loader2
                  aria-label="Thinking"
                  className="h-4 w-4 animate-spin"
                />
              ) : null)}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      )}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <label htmlFor={`tutor-${exercise.id}`} className="sr-only">
          Ask the tutor
        </label>
        <textarea
          id={`tutor-${exercise.id}`}
          ref={inputRef}
          value={input}
          maxLength={4000}
          rows={2}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask a question…"
          className="border-line bg-bg placeholder:text-muted flex-1 resize-none rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="self-end rounded-md bg-[var(--track-ai)] p-2 text-black disabled:opacity-50"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
    </aside>
  );
}
