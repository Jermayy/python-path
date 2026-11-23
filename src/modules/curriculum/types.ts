/** Curriculum domain types. Pure data — no framework imports. */

export type Difficulty = "easy" | "medium" | "hard";

export type ContentBlock =
  | { kind: "text"; body: string }
  | { kind: "code"; code: string; caption?: string }
  /** Side-by-side comparison for learners coming from Dart / TypeScript. */
  | {
      kind: "compare";
      python: string;
      other: string;
      otherLang: "dart" | "ts";
      note?: string;
    }
  | { kind: "callout"; tone: "tip" | "warning" | "interview"; body: string };

export interface CodeTest {
  /** Human-readable description shown in the test results. */
  name: string;
  /** Python statements run after the learner's code in the same namespace; must raise on failure. */
  code: string;
  /** Hidden tests aren't shown to the learner until they pass (prevents hard-coding answers). */
  hidden?: boolean;
}

export interface CodeExercise {
  kind: "code";
  id: string;
  title: string;
  difficulty: Difficulty;
  prompt: string;
  starter: string;
  solution: string;
  tests: CodeTest[];
  hints: string[];
  /** Explanation shown after solving: why the solution works, complexity, idioms. */
  explanation: string;
  /** Pyodide packages to load before running (e.g. "pydantic", "numpy"). */
  packages?: string[];
}

export interface QuizExercise {
  kind: "quiz";
  id: string;
  title: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export type Exercise = CodeExercise | QuizExercise;

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  content: ContentBlock[];
  exercises: Exercise[];
}

export type Track = "foundations" | "engineering" | "backend" | "ai" | "career";

export interface Module {
  id: string;
  order: number;
  title: string;
  track: Track;
  tagline: string;
  /** What a hiring manager expects you to be able to do after this module. */
  outcomes: string[];
  lessons: Lesson[];
}
