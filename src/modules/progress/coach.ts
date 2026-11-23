import {
  allExercises,
  getExercise,
  lessonHref,
  type ExerciseRef,
} from "@/modules/curriculum";
import { isCompleted, nextLesson } from "./gamification";
import type { ProgressState } from "./types";

export type Pace = "struggling" | "steady" | "cruising";

export interface Recommendation {
  pace: Pace;
  headline: string;
  detail: string;
  action?: { label: string; href: string };
  /** Facts sent to the AI coach (no code, no personal data). */
  signals: {
    recentSolved: number;
    avgAttempts: number;
    avgHints: number;
    firstTryRate: number;
  };
}

const RECENT = 6;

/** Deterministic, offline coaching based on recent performance. The AI coach builds on these signals. */
export function recommend(state: ProgressState): Recommendation {
  const recent = Object.values(state.exercises)
    .filter(
      (e) =>
        e.status === "completed" &&
        getExercise(e.exerciseId)?.exercise.kind === "code" &&
        e.completedAt,
    )
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
    .slice(0, RECENT);

  const n = recent.length;
  const avg = (f: (e: (typeof recent)[number]) => number) =>
    n ? recent.reduce((s, e) => s + f(e), 0) / n : 0;
  const signals = {
    recentSolved: n,
    avgAttempts: Math.round(avg((e) => e.attempts) * 10) / 10,
    avgHints: Math.round(avg((e) => e.hintsUsed) * 10) / 10,
    firstTryRate:
      Math.round(
        avg((e) => (e.attempts <= 1 && e.hintsUsed === 0 ? 1 : 0)) * 100,
      ) / 100,
  };
  const next = nextLesson(state);
  const nextAction = next
    ? {
        label: `Continue: ${next.lesson.title}`,
        href: lessonHref(next.module.id, next.lesson.id),
      }
    : undefined;

  if (n === 0) {
    return {
      pace: "steady",
      headline: "Let's get your first win",
      detail:
        "Start with the basics — each exercise takes 5–10 minutes. Try before you peek at hints: first-try solves earn +20% XP.",
      action: nextAction,
      signals,
    };
  }

  if (n >= 3 && (signals.avgHints >= 1.5 || signals.avgAttempts >= 4)) {
    const review = reviewTarget(
      state,
      recent.map((r) => r.exerciseId),
    );
    return {
      pace: "struggling",
      headline: "Slow down and consolidate",
      detail: `Your last ${n} solves averaged ${signals.avgAttempts} attempts and ${signals.avgHints} hints. That's normal on new material — re-read the lesson notes, then redo one exercise from memory before moving on.`,
      action: review
        ? {
            label: `Review: ${review.lesson.title}`,
            href: lessonHref(review.module.id, review.lesson.id),
          }
        : nextAction,
      signals,
    };
  }

  if (n >= 3 && signals.firstTryRate >= 0.67) {
    const hard = nextHard(state);
    return {
      pace: "cruising",
      headline: "You're cruising — take on a challenge",
      detail: `${Math.round(signals.firstTryRate * 100)}% of your recent solves were first-try with no hints. Jump to a hard exercise to stretch yourself; nothing on the roadmap is locked.`,
      action: hard
        ? {
            label: `Challenge: ${hard.exercise.title}`,
            href: lessonHref(hard.module.id, hard.lesson.id),
          }
        : nextAction,
      signals,
    };
  }

  return {
    pace: "steady",
    headline: "Steady progress — keep the streak alive",
    detail: "You're learning at a good pace. One lesson a day compounds fast.",
    action: nextAction,
    signals,
  };
}

function reviewTarget(
  state: ProgressState,
  recentIds: string[],
): ExerciseRef | undefined {
  const worst = recentIds
    .map((id) => state.exercises[id])
    .sort((a, b) => b.hintsUsed + b.attempts - (a.hintsUsed + a.attempts))[0];
  return worst ? getExercise(worst.exerciseId) : undefined;
}

function nextHard(state: ProgressState): ExerciseRef | undefined {
  return allExercises.find(
    (r) =>
      r.exercise.difficulty === "hard" &&
      r.exercise.kind === "code" &&
      !isCompleted(state, r.exercise.id),
  );
}
