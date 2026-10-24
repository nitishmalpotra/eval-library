import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllEvals } from "@/lib/evals";
import { findDailyLimit } from "@/lib/findQuota";
import { FindClient } from "./FindClient";

export const metadata: Metadata = {
  title: "Find an eval for your feature · AI PM Eval Library",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

export default function FindPage() {
  return (
    <Suspense fallback={null}>
      <FindClient dailyLimit={findDailyLimit()} patternCount={getAllEvals().length} />
    </Suspense>
  );
}
