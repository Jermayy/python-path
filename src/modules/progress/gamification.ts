import {
  allExercises,
  getExercise,
  lessonSequence,
  modules,
  type Difficulty,
  type Exercise,
} from "@/modules/curriculum";
import type { ProgressState } from "./types";

const CODE_XP: Record<Difficulty, number> = { easy: 10, medium: 25, hard: 50 };
const QUIZ_XP: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 15 };
export const MODULE_BONUS_XP = 100;

export function baseXp(exercise: Exercise): number {
  return exercise.kind === "code"
    ? CODE_XP[exercise.difficulty]
    : QUIZ_XP[exercise.difficulty];
}

/** XP for a completed exercise: −20% per hint (floor 50%), +20% for a first-try solve. */
export function exerciseXp(
  exercise: Exercise,
  attempts: number,
  hintsUsed: number,
): number {
  const base = baseXp(exercise);
  const hintFactor = Math.max(0.5, 1 - 0.2 * hintsUsed);
  const firstTry = attempts <= 1 && hintsUsed === 0 ? 1.2 : 1;
  return Math.round(base * hintFactor * firstTry);
}

export function isCompleted(state: ProgressState, exerciseId: string): boolean {
  return state.exercises[exerciseId]?.status === "completed";
}

export function moduleCompletion(state: ProgressState, moduleId: string) {
  const mod = modules.find((m) => m.id === moduleId);
  const ids = mod?.lessons.flatMap((l) => l.exercises.map((e) => e.id)) ?? [];
  const done = ids.filter((id) => isCompleted(state, id)).length;
  return { done, total: ids.length, ratio: ids.length ? done / ids.length : 0 };
}

export function lessonCompletion(state: ProgressState, exerciseIds: string[]) {
  const done = exerciseIds.filter((id) => isCompleted(state, id)).length;
  return {
    done,
    total: exerciseIds.length,
    complete: done === exerciseIds.length,
  };
}

export function totalXp(state: ProgressState): number {
  let xp = 0;
  for (const record of Object.values(state.exercises)) {
    if (record.status !== "completed") continue;
    const ref = getExercise(record.exerciseId);
    if (ref) xp += exerciseXp(ref.exercise, record.attempts, record.hintsUsed);
  }
  for (const m of modules)
    if (moduleCompletion(state, m.id).ratio === 1) xp += MODULE_BONUS_XP;
  return xp;
}

export const LEVEL_TITLES = [
  "Hello, World",
  "Script Kiddo",
  "Loop Wrangler",
  "Comprehension Crafter",
  "Pythonista",
  "API Builder",
  "Async Adept",
  "Vector Voyager",
  "Agent Architect",
  "Eval Engineer",
  "Production Pro",
  "Forward Deployed",
] as const;

/** XP needed to reach `level` (1-based): 0, 100, 300, 600, 1000, ... */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelInfo(xp: number) {
  let level = 1;
  while (level < LEVEL_TITLES.length && xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const isMax = level === LEVEL_TITLES.length;
  const ceiling = isMax ? floor : xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[level - 1],
    xpIntoLevel: xp - floor,
    xpForNext: ceiling - floor,
    progress: isMax ? 1 : (xp - floor) / (ceiling - floor),
    isMax,
  };
}

/** Local-calendar YYYY-MM-DD for a date. */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

/** Consecutive active days ending today, or ending yesterday if today has no activity yet. */
export function currentStreak(activityDays: string[], today: Date): number {
  const days = new Set(activityDays);
  let cursor = localDay(today);
  if (!days.has(cursor)) cursor = previousDay(cursor);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }
  return streak;
}

export function longestStreak(activityDays: string[]): number {
  const days = new Set(activityDays);
  let best = 0;
  for (const day of days) {
    if (days.has(previousDay(day))) continue; // not the start of a run
    let len = 0;
    let cursor = day;
    while (days.has(cursor)) {
      len++;
      const [y, m, d] = cursor.split("-").map(Number);
      cursor = localDay(new Date(y, m - 1, d + 1));
    }
    best = Math.max(best, len);
  }
  return best;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export function badges(state: ProgressState): Badge[] {
  const completed = Object.values(state.exercises).filter(
    (e) => e.status === "completed",
  );
  const completedCode = completed.filter(
    (e) => getExercise(e.exerciseId)?.exercise.kind === "code",
  );
  const noHintHard = completed.filter((e) => {
    const ex = getExercise(e.exerciseId)?.exercise;
    return ex?.difficulty === "hard" && e.hintsUsed === 0;
  });
  const firstTry = completedCode.filter(
    (e) => e.attempts <= 1 && e.hintsUsed === 0,
  );
  const doneModule = (id: string) => moduleCompletion(state, id).ratio === 1;
  const trackDone = (track: string) =>
    modules.filter((m) => m.track === track).every((m) => doneModule(m.id));
  const longest = longestStreak(state.activityDays);
  const defs: Omit<Badge, "earned">[] = [
    {
      id: "first-blood",
      name: "First Steps",
      description: "Complete your first exercise",
      icon: "🐣",
    },
    {
      id: "ten-down",
      name: "Warmed Up",
      description: "Complete 10 exercises",
      icon: "🔥",
    },
    {
      id: "first-try",
      name: "Sharpshooter",
      description: "Solve 5 code exercises first try with no hints",
      icon: "🎯",
    },
    {
      id: "no-hint-hard",
      name: "Unassisted",
      description: "Solve a hard exercise without hints",
      icon: "🧠",
    },
    {
      id: "streak-3",
      name: "Habit Forming",
      description: "Reach a 3-day streak",
      icon: "📅",
    },
    {
      id: "streak-7",
      name: "Week Warrior",
      description: "Reach a 7-day streak",
      icon: "⚡",
    },
    {
      id: "foundations",
      name: "Solid Foundations",
      description: "Finish the Foundations track",
      icon: "🧱",
    },
    {
      id: "backend",
      name: "Server Side",
      description: "Finish the Backend & Full-stack track",
      icon: "🛠️",
    },
    {
      id: "rag",
      name: "Retriever",
      description: "Finish Embeddings, Vectors & RAG",
      icon: "🔎",
    },
    {
      id: "evals",
      name: "Measure Twice",
      description: "Finish the Evals module",
      icon: "📏",
    },
    {
      id: "ai",
      name: "AI Engineer",
      description: "Finish the AI Engineering track",
      icon: "🤖",
    },
    {
      id: "graduate",
      name: "Hire Me",
      description: "Complete the entire path",
      icon: "🎓",
    },
  ];
  const earned: Record<string, boolean> = {
    "first-blood": completed.length >= 1,
    "ten-down": completed.length >= 10,
    "first-try": firstTry.length >= 5,
    "no-hint-hard": noHintHard.length >= 1,
    "streak-3": longest >= 3,
    "streak-7": longest >= 7,
    foundations: trackDone("foundations"),
    backend: trackDone("backend"),
    rag: doneModule("rag-vectors"),
    evals: doneModule("evals"),
    ai: trackDone("ai"),
    graduate: allExercises.every((r) => isCompleted(state, r.exercise.id)),
  };
  return defs.map((d) => ({ ...d, earned: earned[d.id] }));
}

/** The first lesson in path order with an incomplete exercise. */
export function nextLesson(state: ProgressState) {
  return lessonSequence.find((ref) =>
    ref.lesson.exercises.some((e) => !isCompleted(state, e.id)),
  );
}

export function overallCompletion(state: ProgressState) {
  const done = allExercises.filter((r) =>
    isCompleted(state, r.exercise.id),
  ).length;
  return {
    done,
    total: allExercises.length,
    ratio: allExercises.length ? done / allExercises.length : 0,
  };
}
