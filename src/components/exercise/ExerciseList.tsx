"use client";

import { getExercise } from "@/modules/curriculum";
import { CodeExerciseCard } from "./CodeExerciseCard";
import { QuizCard } from "./QuizCard";

export function ExerciseList({ exerciseIds }: { exerciseIds: string[] }) {
  return (
    <ol className="space-y-6">
      {exerciseIds.map((id, i) => {
        const ref = getExercise(id);
        if (!ref) return null;
        return (
          <li key={id}>
            {ref.exercise.kind === "code" ? (
              <CodeExerciseCard exercise={ref.exercise} index={i + 1} />
            ) : (
              <QuizCard exercise={ref.exercise} index={i + 1} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
