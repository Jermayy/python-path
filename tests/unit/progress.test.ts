import { describe, expect, it } from "vitest";
import { allExercises, getExercise, modules } from "@/modules/curriculum";
import {
  recordAttempt,
  recordHint,
  saveDraft,
} from "@/modules/progress/actions";
import {
  badges,
  currentStreak,
  exerciseXp,
  levelInfo,
  longestStreak,
  MODULE_BONUS_XP,
  moduleCompletion,
  nextLesson,
  totalXp,
  xpForLevel,
} from "@/modules/progress/gamification";
import { mergeExercise, mergeProgress } from "@/modules/progress/merge";
import {
  emptyProgress,
  MAX_CODE_LENGTH,
  type ExerciseProgress,
  type ProgressState,
} from "@/modules/progress/types";

const T0 = new Date(2026, 10, 20, 9, 0, 0);
const at = (days: number, hours = 0) =>
  new Date(T0.getTime() + days * 86_400_000 + hours * 3_600_000);

function record(overrides: Partial<ExerciseProgress> = {}): ExerciseProgress {
  return {
    exerciseId: "basics-greeting",
    status: "attempted",
    attempts: 1,
    hintsUsed: 0,
    completedAt: null,
    updatedAt: "2026-11-20T00:00:00.000Z",
    code: null,
    ...overrides,
  };
}

function completeAll(ids: string[], when = T0): ProgressState {
  let state = emptyProgress();
  for (const id of ids)
    state = recordAttempt(state, id, true, null, when).state;
  return state;
}

describe("recordAttempt", () => {
  it("counts attempts until solved, then stops", () => {
    let s = emptyProgress();
    s = recordAttempt(s, "basics-greeting", false, "x", at(0)).state;
    const second = recordAttempt(s, "basics-greeting", true, "y", at(0, 1));
    expect(second.newlyCompleted).toBe(true);
    expect(second.record).toMatchObject({
      attempts: 2,
      status: "completed",
      code: "y",
    });
    const replay = recordAttempt(
      second.state,
      "basics-greeting",
      false,
      "z",
      at(0, 2),
    );
    expect(replay.newlyCompleted).toBe(false);
    expect(replay.record).toMatchObject({
      attempts: 2,
      status: "completed",
      completedAt: at(0, 1).toISOString(),
    });
  });

  it("records the local activity day only on completion", () => {
    const failed = recordAttempt(
      emptyProgress(),
      "basics-greeting",
      false,
      null,
      at(0),
    ).state;
    expect(failed.activityDays).toEqual([]);
    const passed = recordAttempt(
      failed,
      "basics-greeting",
      true,
      null,
      at(0),
    ).state;
    expect(passed.activityDays).toEqual(["2026-11-20"]);
  });

  it("truncates stored code", () => {
    const { record: r } = recordAttempt(
      emptyProgress(),
      "basics-greeting",
      false,
      "a".repeat(MAX_CODE_LENGTH + 5),
      T0,
    );
    expect(r.code).toHaveLength(MAX_CODE_LENGTH);
  });
});

describe("recordHint / saveDraft", () => {
  it("counts hints only before completion", () => {
    let s = recordHint(emptyProgress(), "basics-greeting", T0).state;
    expect(s.exercises["basics-greeting"].hintsUsed).toBe(1);
    s = recordAttempt(s, "basics-greeting", true, null, T0).state;
    s = recordHint(s, "basics-greeting", T0).state;
    expect(s.exercises["basics-greeting"].hintsUsed).toBe(1);
  });

  it("saves drafts without changing status", () => {
    const s = saveDraft(
      emptyProgress(),
      "basics-greeting",
      "print(1)",
      T0,
    ).state;
    expect(s.exercises["basics-greeting"]).toMatchObject({
      status: "attempted",
      attempts: 0,
      code: "print(1)",
    });
  });
});

describe("mergeExercise", () => {
  const a = record({
    attempts: 3,
    hintsUsed: 1,
    updatedAt: "2026-11-20T01:00:00Z",
    code: "old",
  });
  const b = record({
    status: "completed",
    attempts: 2,
    completedAt: "2026-11-20T02:00:00Z",
    updatedAt: "2026-11-20T02:00:00Z",
    code: "new",
  });

  it("keeps the strongest facts and newest code", () => {
    expect(mergeExercise(a, b)).toEqual({
      ...b,
      attempts: 3,
      hintsUsed: 1,
    });
  });

  it("is commutative, idempotent and associative", () => {
    const c = record({
      attempts: 5,
      updatedAt: "2026-11-20T03:00:00Z",
      code: null,
    });
    expect(mergeExercise(a, b)).toEqual(mergeExercise(b, a));
    expect(mergeExercise(a, a)).toEqual(a);
    expect(mergeExercise(mergeExercise(a, b), c)).toEqual(
      mergeExercise(a, mergeExercise(b, c)),
    );
  });

  it("is commutative on timestamp ties", () => {
    const x = record({ code: "x" });
    const y = record({ code: "y" });
    expect(mergeExercise(x, y)).toEqual(mergeExercise(y, x));
  });

  it("keeps the earliest completion time", () => {
    const early = record({
      status: "completed",
      completedAt: "2026-01-01T00:00:00Z",
    });
    const late = record({
      status: "completed",
      completedAt: "2026-02-01T00:00:00Z",
    });
    expect(mergeExercise(late, early).completedAt).toBe("2026-01-01T00:00:00Z");
  });
});

describe("mergeProgress", () => {
  it("unions exercises and activity days", () => {
    const left: ProgressState = {
      exercises: { a: record({ exerciseId: "a" }) },
      activityDays: ["2026-11-02"],
    };
    const right: ProgressState = {
      exercises: { b: record({ exerciseId: "b" }) },
      activityDays: ["2026-11-01", "2026-11-02"],
    };
    const merged = mergeProgress(left, right);
    expect(Object.keys(merged.exercises).sort()).toEqual(["a", "b"]);
    expect(merged.activityDays).toEqual(["2026-11-01", "2026-11-02"]);
  });
});

describe("XP and levels", () => {
  const easyCode = getExercise("basics-greeting")!.exercise;
  const hardCode = getExercise("ps-search-rotated")!.exercise;
  const easyQuiz = getExercise("basics-truthiness")!.exercise;

  it("rewards first-try solves and penalises hints with a floor", () => {
    expect(exerciseXp(easyCode, 1, 0)).toBe(12);
    expect(exerciseXp(easyCode, 3, 0)).toBe(10);
    expect(exerciseXp(hardCode, 2, 1)).toBe(40);
    expect(exerciseXp(hardCode, 2, 9)).toBe(25);
    expect(exerciseXp(easyQuiz, 1, 0)).toBe(6);
  });

  it("adds a module bonus when a module is complete", () => {
    const mod = modules[0];
    const ids = mod.lessons.flatMap((l) => l.exercises.map((e) => e.id));
    const state = completeAll(ids);
    const perExercise = ids.reduce(
      (sum, id) => sum + exerciseXp(getExercise(id)!.exercise, 1, 0),
      0,
    );
    expect(totalXp(state)).toBe(perExercise + MODULE_BONUS_XP);
    expect(moduleCompletion(state, mod.id)).toEqual({
      done: ids.length,
      total: ids.length,
      ratio: 1,
    });
  });

  it("computes level boundaries", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(levelInfo(0)).toMatchObject({
      level: 1,
      xpIntoLevel: 0,
      xpForNext: 100,
    });
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100)).toMatchObject({
      level: 2,
      xpIntoLevel: 0,
      xpForNext: 200,
    });
    expect(levelInfo(1_000_000)).toMatchObject({
      isMax: true,
      progress: 1,
      title: "Forward Deployed",
    });
  });

  it("the full path reaches at least level 8", () => {
    const state = completeAll(allExercises.map((r) => r.exercise.id));
    expect(levelInfo(totalXp(state)).level).toBeGreaterThanOrEqual(8);
  });
});

describe("streaks", () => {
  const today = new Date(2026, 10, 23, 12);

  it("counts back from today, or from yesterday if today is empty", () => {
    expect(
      currentStreak(["2026-11-21", "2026-11-22", "2026-11-23"], today),
    ).toBe(3);
    expect(currentStreak(["2026-11-21", "2026-11-22"], today)).toBe(2);
    expect(currentStreak(["2026-11-20", "2026-11-21"], today)).toBe(0);
    expect(currentStreak([], today)).toBe(0);
  });

  it("handles month boundaries", () => {
    expect(
      currentStreak(["2026-10-31", "2026-11-01"], new Date(2026, 10, 1, 8)),
    ).toBe(2);
  });

  it("finds the longest run", () => {
    expect(
      longestStreak([
        "2026-11-01",
        "2026-11-02",
        "2026-11-05",
        "2026-11-06",
        "2026-11-07",
      ]),
    ).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("badges and next lesson", () => {
  it("earns first-steps and points to the next lesson", () => {
    const state = completeAll(["basics-greeting"]);
    const earned = badges(state)
      .filter((b) => b.earned)
      .map((b) => b.id);
    expect(earned).toContain("first-blood");
    expect(earned).not.toContain("ten-down");
    expect(nextLesson(state)?.lesson.id).toBe("variables-and-types");
  });

  it("graduates when everything is complete", () => {
    const state = completeAll(allExercises.map((r) => r.exercise.id));
    expect(badges(state).find((b) => b.id === "graduate")?.earned).toBe(true);
    expect(nextLesson(state)).toBeUndefined();
  });
});
