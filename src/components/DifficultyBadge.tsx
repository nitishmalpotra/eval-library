import type { Difficulty } from "@/lib/taxonomy";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className="difficulty-chip">{difficulty}</span>;
}
