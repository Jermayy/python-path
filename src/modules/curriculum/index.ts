import { pythonBasics } from "./content/01-python-basics";
import { dataStructures } from "./content/02-data-structures";
import { problemSolving } from "./content/03-problem-solving";
import { idiomaticPython } from "./content/04-idiomatic-python";
import { typingTesting } from "./content/05-typing-testing";
import { backendApis } from "./content/06-backend-apis";
import { asyncReliability } from "./content/07-async-reliability";
import { fullstack } from "./content/08-fullstack";
import { llmFoundations } from "./content/09-llm-foundations";
import { ragVectors } from "./content/10-rag-vectors";
import { agentsOrchestration } from "./content/11-agents-orchestration";
import { evals } from "./content/12-evals";
import { trainingFinetuning } from "./content/13-training-finetuning";
import { productionCareer } from "./content/14-production-career";
import type { Exercise, Lesson, Module, Track } from "./types";

export * from "./types";

export const modules: readonly Module[] = [
  pythonBasics,
  dataStructures,
  problemSolving,
  idiomaticPython,
  typingTesting,
  backendApis,
  asyncReliability,
  fullstack,
  llmFoundations,
  ragVectors,
  agentsOrchestration,
  evals,
  trainingFinetuning,
  productionCareer,
].sort((a, b) => a.order - b.order);

export const trackLabels: Record<Track, string> = {
  foundations: "Foundations",
  engineering: "Engineering",
  backend: "Backend & Full-stack",
  ai: "AI Engineering",
  career: "Career",
};

export interface LessonRef {
  module: Module;
  lesson: Lesson;
  /** 0-based position in the overall path. */
  index: number;
}

export interface ExerciseRef extends LessonRef {
  exercise: Exercise;
}

export const lessonSequence: readonly LessonRef[] = modules
  .flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })))
  .map((ref, index) => ({ ...ref, index }));

const exerciseIndex = new Map<string, ExerciseRef>();
for (const ref of lessonSequence) {
  for (const exercise of ref.lesson.exercises) {
    if (exerciseIndex.has(exercise.id))
      throw new Error(`Duplicate exercise id: ${exercise.id}`);
    exerciseIndex.set(exercise.id, { ...ref, exercise });
  }
}

export const allExercises: readonly ExerciseRef[] = [...exerciseIndex.values()];

export function getExercise(id: string): ExerciseRef | undefined {
  return exerciseIndex.get(id);
}

export function getLesson(
  moduleId: string,
  lessonId: string,
): LessonRef | undefined {
  return lessonSequence.find(
    (r) => r.module.id === moduleId && r.lesson.id === lessonId,
  );
}

export function getModule(moduleId: string): Module | undefined {
  return modules.find((m) => m.id === moduleId);
}

export function lessonHref(moduleId: string, lessonId: string): string {
  return `/learn/${moduleId}/${lessonId}`;
}

export function neighbours(ref: LessonRef): {
  prev?: LessonRef;
  next?: LessonRef;
} {
  return {
    prev: lessonSequence[ref.index - 1],
    next: lessonSequence[ref.index + 1],
  };
}
