import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";
import { z } from "zod";
import type { EvalPattern } from "@/lib/evals";

type EvalEmbeddings = {
  vectors: Array<{
    id: string;
    vector: number[];
  }>;
};

const requestSchema = z.object({
  query: z.string().min(5, "Query must be at least 5 characters").max(2000, "Query must be at most 2000 characters"),
});

const deepSeekResponseSchema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      rationale: z.string(),
    }),
  ),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

let evalEmbeddings: EvalEmbeddings;
let evalPatterns: EvalPattern[];

const dataPromise = Promise.all([
  fs.readFile(path.join(process.cwd(), "data", "eval-embeddings.json"), "utf8"),
  fs.readFile(path.join(process.cwd(), "data", "evals.json"), "utf8"),
]).then(([embeddingsJson, evalsJson]) => {
  evalEmbeddings = JSON.parse(embeddingsJson) as EvalEmbeddings;
  evalPatterns = JSON.parse(evalsJson) as EvalPattern[];
});

function dotProduct(left: number[], right: number[]) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export async function POST(request: Request) {
  try {
    await dataPromise;

    const body = await request.json();
    const parsedBody = requestSchema.safeParse(body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues[0]?.message ?? "Invalid request body";
      console.error(parsedBody.error);
      return Response.json({ error: message }, { status: 400 });
    }

    let queryVector: number[];

    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: parsedBody.data.query,
      });

      queryVector = embeddingResponse.data[0].embedding;
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Model service unavailable, try again" }, { status: 502 });
    }

    const topCandidates = evalEmbeddings.vectors
      .map(({ id, vector }) => ({
        id,
        score: dotProduct(vector, queryVector),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    const patternsById = new Map(evalPatterns.map((pattern) => [pattern.id, pattern]));
    const candidates = topCandidates
      .map(({ id }) => patternsById.get(id))
      .filter((pattern): pattern is EvalPattern => Boolean(pattern));

    const candidateSummary = candidates
      .map((pattern) => ({
        id: pattern.id,
        name: pattern.name,
        one_liner: pattern.one_liner,
        definition: pattern.definition,
        when_to_use: pattern.when_to_use.slice(0, 3),
      }));

    let deepSeekContent: string | null;

    try {
      const completion = await deepseek.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are an expert AI product manager. Return JSON only in this shape: {"matches":[{"id":"...","rationale":"..."}]}.',
          },
          {
            role: "user",
            content: [
              "User query:",
              parsedBody.data.query,
              "",
              "Candidate eval patterns:",
              JSON.stringify(candidateSummary),
              "",
              "Pick the 3 most relevant patterns. Write one single-sentence rationale per pick under 25 words.",
            ].join("\n"),
          },
        ],
      });

      deepSeekContent = completion.choices[0]?.message.content;
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Model service unavailable, try again" }, { status: 502 });
    }

    if (!deepSeekContent) {
      throw new Error("DeepSeek returned an empty response");
    }

    const deepSeekResponse = deepSeekResponseSchema.parse(JSON.parse(deepSeekContent));
    const scoresById = new Map(topCandidates.map((candidate) => [candidate.id, candidate.score]));

    return Response.json({
      matches: deepSeekResponse.matches
        .filter((match) => scoresById.has(match.id))
        .slice(0, 3)
        .map((match) => ({
          id: match.id,
          rationale: match.rationale,
          score: scoresById.get(match.id),
        })),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
