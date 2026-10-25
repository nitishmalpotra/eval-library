"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { featureTypes } from "@/lib/taxonomy";

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
            aria-pressed={active}
            onClick={() => toggleFeatureType(featureType)}
            className="filter-chip"
          >
            {featureType.replaceAll("_", " ")}
          </button>
        );
      })}
    </div>
  );
}
