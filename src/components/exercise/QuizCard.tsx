"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { RichText } from "@/components/RichText";
import type { QuizExercise } from "@/modules/curriculum";
import { baseXp } from "@/modules/progress/gamification";
import { useProgress } from "@/modules/progress/ProgressProvider";
import { DifficultyBadge } from "./DifficultyBadge";

export function QuizCard({
  exercise,
  index,
}: {
  exercise: QuizExercise;
  index: number;
}) {
  const { state, attempt } = useProgress();
  const completed = state.exercises[exercise.id]?.status === "completed";
  const [choice, setChoice] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<number | null>(null);
  const name = useId();
  const correct = submitted === exercise.answerIndex;
  const showExplanation = completed || submitted !== null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (choice === null) return;
    setSubmitted(choice);
    attempt(exercise.id, choice === exercise.answerIndex, null);
  }

  return (
    <article
      aria-labelledby={`${name}-title`}
      className={`bg-elevated rounded-xl border p-5 ${completed ? "border-success/50" : "border-line"}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 id={`${name}-title`} className="font-semibold">
          {index}. {exercise.title}
        </h3>
        <span className="border-line text-muted rounded-full border px-2 py-0.5 text-xs">
          Quiz
        </span>
        <DifficultyBadge difficulty={exercise.difficulty} />
        <span className="text-muted ml-auto text-xs">
          {baseXp(exercise)} XP
        </span>
        {completed && (
          <CheckCircle2
            aria-label="Completed"
            className="text-success h-5 w-5"
          />
        )}
      </header>
      <form onSubmit={submit} className="mt-3">
        <fieldset>
          <legend className="mb-3">
            <RichText text={exercise.question} />
          </legend>
          <div className="space-y-2">
            {exercise.options.map((opt, i) => {
              const isAnswer = showExplanation && i === exercise.answerIndex;
              const isWrongPick = submitted === i && !correct;
              return (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    isAnswer
                      ? "border-success bg-success/10"
                      : isWrongPick
                        ? "border-danger bg-danger/10"
                        : "border-line hover:bg-sunken"
                  }`}
                >
                  <input
                    type="radio"
                    name={name}
                    value={i}
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                    className="accent-[var(--brand)]"
                  />
                  <RichText text={opt} />
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={choice === null}
            className="bg-brand-solid hover:bg-brand-solid-hover rounded-md px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Check answer
          </button>
          <p role="status" className="text-sm">
            {submitted !== null &&
              (correct ? (
                <span className="text-success">Correct!</span>
              ) : (
                <span className="text-danger inline-flex items-center gap-1">
                  <XCircle aria-hidden="true" className="h-4 w-4" /> Not quite —
                  see the explanation.
                </span>
              ))}
          </p>
        </div>
      </form>
      {showExplanation && (
        <p className="bg-sunken text-muted mt-3 rounded-lg p-3 text-sm">
          <RichText text={exercise.explanation} />
        </p>
      )}
    </article>
  );
}
