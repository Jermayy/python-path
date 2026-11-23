import type { Difficulty } from "@/modules/curriculum";

const style: Record<Difficulty, string> = {
  easy: "text-success border-success/40",
  medium: "text-warning border-warning/40",
  hard: "text-danger border-danger/40",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${style[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}
