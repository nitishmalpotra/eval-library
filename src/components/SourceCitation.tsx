import type { EvalPattern } from "@/lib/evals";

type SourceCitationProps = Pick<
  EvalPattern,
  "source_operator" | "source_title" | "source_date" | "source_url"
> & {
  compact?: boolean;
};

export function SourceCitation({
  source_operator,
  source_title,
  source_date,
  source_url,
  compact = false,
}: SourceCitationProps) {
  return (
    <div className={`border-l-2 border-blue-600 pl-4 dark:border-blue-500 ${compact ? "my-3" : "my-6"}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium text-slate-900 dark:text-slate-100">{source_operator}</span>
        {source_url ? (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 underline-offset-4 decoration-slate-400 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
          >
            {source_title}
          </a>
        ) : (
          <span className="text-slate-600 dark:text-slate-400">{source_title}</span>
        )}
      </div>
      <div className="mt-1.5 font-mono text-xs text-slate-500">{source_date}</div>
    </div>
  );
}
