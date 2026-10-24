import type { CardFields } from "@/lib/evals";

export const rejectionReasons = ["gibberish", "too_vague", "off_topic", "not_a_request", "no_match"] as const;

export type RejectionReason = (typeof rejectionReasons)[number];

export type FindMatch = {
  id: string;
  rationale: string;
  score: number;
  fit: "strong" | "weak";
  pattern: CardFields;
};

export type FindResult =
  | { status: "ok"; matches: FindMatch[] }
  | { status: "rejected"; reason: RejectionReason };
