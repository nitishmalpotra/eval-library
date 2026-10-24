import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const rejectionReasons = ["gibberish", "too_vague", "off_topic", "not_a_request", "no_match"] as const;

export const searchEvalCaseSchema = z
  .object({
    query: z.string().trim().min(1),
    expect: z.enum(["accept", "reject"]),
    reason: z.enum(rejectionReasons).optional(),
    primary_ids: z.array(z.string().min(1)).min(1).max(2).optional(),
    related_ids: z.array(z.string().min(1)).min(1).optional(),
    note: z.string().optional(),
    base_query: z.string().trim().min(1).optional(),
  })
  .superRefine((item, ctx) => {
    const primary = item.primary_ids ?? [];
    const related = item.related_ids ?? [];

    if (primary.some((id) => related.includes(id))) {
      ctx.addIssue({ code: "custom", message: `${item.query}: primary_ids and related_ids overlap` });
    }

    if (item.expect === "accept" && item.reason) {
      ctx.addIssue({ code: "custom", message: `${item.query}: accept cases do not take a rejection reason` });
    }

    if (item.expect === "reject" && !item.reason) {
      ctx.addIssue({ code: "custom", message: `${item.query}: reject cases need a reason` });
    }

    if (item.expect === "reject" && (primary.length > 0 || related.length > 0)) {
      ctx.addIssue({ code: "custom", message: `${item.query}: reject cases do not take pattern ids` });
    }
  });

export const searchEvalFileSchema = z.array(searchEvalCaseSchema).min(1);

export type SearchEvalCase = z.infer<typeof searchEvalCaseSchema>;

export async function loadSearchEvals(): Promise<SearchEvalCase[]> {
  const file = path.join(process.cwd(), "data", "search-evals.json");
  return searchEvalFileSchema.parse(JSON.parse(await readFile(file, "utf8")));
}
