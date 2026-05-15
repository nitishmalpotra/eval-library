"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { featureTypes } from "@/lib/evals";

export function FeatureTypeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = new Set(searchParams.get("ft")?.split(",").filter(Boolean) ?? []);

  function toggleFeatureType(featureType: string) {
    const params = new URLSearchParams(searchParams.toString());
    const next = new Set(selected);

    if (next.has(featureType)) {
      next.delete(featureType);
    } else {
      next.add(featureType);
    }

    if (next.size > 0) {
      params.set("ft", Array.from(next).join(","));
    } else {
      params.delete("ft");
    }

    router.push(`/browse${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {featureTypes.map((featureType) => {
        const active = selected.has(featureType);

        return (
          <button
            key={featureType}
            type="button"
            onClick={() => toggleFeatureType(featureType)}
            className={`rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] transition ${
              active
                ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
            }`}
          >
            {featureType}
          </button>
        );
      })}
    </div>
  );
}
