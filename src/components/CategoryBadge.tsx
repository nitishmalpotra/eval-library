import type { Category } from "@/lib/evals";

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {category}
    </span>
  );
}
