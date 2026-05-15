import type { Difficulty } from "@/lib/evals";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {difficulty}
    </span>
  );
}
