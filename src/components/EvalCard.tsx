import Link from "next/link";
import type { EvalPattern } from "@/lib/evals";
import { CategoryBadge } from "./CategoryBadge";
import { DifficultyBadge } from "./DifficultyBadge";

export function EvalCard({ pattern }: { pattern: EvalPattern }) {
  return (
    <Link
      href={`/eval/${pattern.id}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:shadow-slate-950/40"
    >
      <div className="flex flex-wrap gap-2">
        <CategoryBadge category={pattern.category} />
        <DifficultyBadge difficulty={pattern.difficulty} />
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {pattern.feature_types[0]}
        </span>
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-400">
        {pattern.name}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{pattern.one_liner}</p>
      <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
        <span className="font-medium text-slate-700 dark:text-slate-300">{pattern.source_operator}</span>
        <span className="mx-2 text-slate-300">·</span>
        <time dateTime={pattern.source_date}>{pattern.source_date}</time>
      </div>
    </Link>
  );
}
