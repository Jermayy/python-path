import type { ExerciseProgress, ProgressState } from "./types";

/**
 * Merges two records of the same exercise. Commutative, associative and idempotent, so
 * devices can sync in any order without losing progress (a state-based CRDT).
 * Must stay in sync with the `upsert_exercise_progress` SQL function.
 */
export function mergeExercise(
  a: ExerciseProgress,
  b: ExerciseProgress,
): ExerciseProgress {
  // Tie-break on code so the result doesn't depend on argument order.
  const newer =
    a.updatedAt !== b.updatedAt
      ? a.updatedAt > b.updatedAt
        ? a
        : b
      : (a.code ?? "") >= (b.code ?? "")
        ? a
        : b;
  const completedAts = [a.completedAt, b.completedAt].filter(
    (v): v is string => v !== null,
  );
  return {
    exerciseId: a.exerciseId,
    status:
      a.status === "completed" || b.status === "completed"
        ? "completed"
        : "attempted",
    attempts: Math.max(a.attempts, b.attempts),
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed),
    completedAt: completedAts.length ? completedAts.sort()[0] : null,
    updatedAt: newer.updatedAt,
    code: newer.code ?? (newer === a ? b.code : a.code),
  };
}

export function mergeProgress(
  a: ProgressState,
  b: ProgressState,
): ProgressState {
  const exercises: Record<string, ExerciseProgress> = { ...a.exercises };
  for (const [id, record] of Object.entries(b.exercises)) {
    exercises[id] = exercises[id]
      ? mergeExercise(exercises[id], record)
      : record;
  }
  const activityDays = [
    ...new Set([...a.activityDays, ...b.activityDays]),
  ].sort();
  return { exercises, activityDays };
}
