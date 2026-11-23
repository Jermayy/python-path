import { localDay } from "./gamification";
import {
  MAX_CODE_LENGTH,
  type ExerciseProgress,
  type ProgressState,
} from "./types";

/** Pure state transitions for learner actions. `now` is injected for deterministic tests. */

function base(
  state: ProgressState,
  exerciseId: string,
  now: Date,
): ExerciseProgress {
  return (
    state.exercises[exerciseId] ?? {
      exerciseId,
      status: "attempted",
      attempts: 0,
      hintsUsed: 0,
      completedAt: null,
      updatedAt: now.toISOString(),
      code: null,
    }
  );
}

export function recordAttempt(
  state: ProgressState,
  exerciseId: string,
  passed: boolean,
  code: string | null,
  now: Date,
): { state: ProgressState; record: ExerciseProgress; newlyCompleted: boolean } {
  const prev = base(state, exerciseId, now);
  const alreadyDone = prev.status === "completed";
  const record: ExerciseProgress = {
    ...prev,
    // Attempts stop counting once solved, so replaying doesn't lower future XP displays.
    attempts: alreadyDone ? prev.attempts : prev.attempts + 1,
    status: passed || alreadyDone ? "completed" : "attempted",
    completedAt: prev.completedAt ?? (passed ? now.toISOString() : null),
    updatedAt: now.toISOString(),
    code: code === null ? prev.code : code.slice(0, MAX_CODE_LENGTH),
  };
  const newlyCompleted = passed && !alreadyDone;
  const day = localDay(now);
  const activityDays =
    newlyCompleted && !state.activityDays.includes(day)
      ? [...state.activityDays, day].sort()
      : state.activityDays;
  return {
    state: {
      exercises: { ...state.exercises, [exerciseId]: record },
      activityDays,
    },
    record,
    newlyCompleted,
  };
}

export function recordHint(
  state: ProgressState,
  exerciseId: string,
  now: Date,
): { state: ProgressState; record: ExerciseProgress } {
  const prev = base(state, exerciseId, now);
  // Hints viewed after solving don't reduce XP retroactively.
  const record: ExerciseProgress =
    prev.status === "completed"
      ? prev
      : {
          ...prev,
          hintsUsed: prev.hintsUsed + 1,
          updatedAt: now.toISOString(),
        };
  return {
    state: {
      ...state,
      exercises: { ...state.exercises, [exerciseId]: record },
    },
    record,
  };
}

export function saveDraft(
  state: ProgressState,
  exerciseId: string,
  code: string,
  now: Date,
): { state: ProgressState; record: ExerciseProgress } {
  const prev = base(state, exerciseId, now);
  const record = {
    ...prev,
    code: code.slice(0, MAX_CODE_LENGTH),
    updatedAt: now.toISOString(),
  };
  return {
    state: {
      ...state,
      exercises: { ...state.exercises, [exerciseId]: record },
    },
    record,
  };
}
