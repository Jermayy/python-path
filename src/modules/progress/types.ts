/** Progress facts. XP, levels and badges are *derived* from these — never stored. */
export interface ExerciseProgress {
  exerciseId: string;
  status: "attempted" | "completed";
  attempts: number;
  hintsUsed: number;
  /** ISO timestamp of first completion. */
  completedAt: string | null;
  /** ISO timestamp of the last change; used to pick the newest saved code. */
  updatedAt: string;
  /** Learner's latest code (code exercises only). */
  code: string | null;
}

export interface ProgressState {
  exercises: Record<string, ExerciseProgress>;
  /** Local calendar days (YYYY-MM-DD) with at least one completed exercise. */
  activityDays: string[];
}

export const emptyProgress = (): ProgressState => ({
  exercises: {},
  activityDays: [],
});

export const MAX_CODE_LENGTH = 20_000;
