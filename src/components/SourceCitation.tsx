import type { EvalPattern } from "@/lib/evals";

type SourceCitationProps = Pick<EvalPattern, "source_operator" | "source_title" | "source_date" | "source_url"> & {
  compact?: boolean;
};

export function SourceCitation({ source_operator, source_title, source_date, source_url, compact = false }: SourceCitationProps) {
  return (
    <div className={`border-l border-accent pl-4 ${compact ? "my-3" : "my-6"}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="text-ink">{source_operator}</span>
        {source_url ? (
          <a href={source_url} target="_blank" rel="noopener noreferrer" className="text-muted underline decoration-accent underline-offset-4">
            {source_title}
          </a>
        ) : (
          <span className="text-muted">{source_title}</span>
        )}
      </div>
      {source_date ? <div className="mt-1.5 font-mono text-xs text-muted">{source_date}</div> : null}
    </div>
  );
}
