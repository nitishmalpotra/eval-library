import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dedupeDocs,
  documentFromRaw,
  operatorFromTitle,
  publicationFor,
  resolveIndexFilename,
  type LoadedDoc,
} from "./corpus";

const frontmatterRaw = `---
title: "An AI glossary"
date: 2025-06-24
author: "Ada Lovelace"
post_url: "https://www.lennysnewsletter.com/p/an-ai-glossary"
---

You're probably hearing a lot of AI jargon.

### Model

An AI model is a computer program.
`;

const headerRaw = `# How to Build AI Evals | Dianne Penn (Anthropic)

**Source:** https://www.youtube.com/watch?v=abc123

## Transcript

### Intro

[0:00] Hello from the transcript.
`;

const indexedRaw = `---
title: "Ignored title | Someone Else"
date: "2020-01-01"
guest: "Ignored Guest"
post_url: "https://www.lennysnewsletter.com/p/the-common-pattern-behind-successful"
youtube_url: "https://www.youtube.com/watch?v=archive"
---

**Mark Pincus** (00:00:00):

If you're truly ambitious, burn your resume.
`;

describe("operatorFromTitle", () => {
  it("takes the name after the last pipe and drops the company", () => {
    assert.equal(
      operatorFromTitle(
        "The hidden pattern behind successful products | Mark Pincus (FarmVille, Words with Friends, & more)",
      ),
      "Mark Pincus",
    );
    assert.equal(
      operatorFromTitle("How to Build AI Evals | Dianne Penn (Anthropic)"),
      "Dianne Penn",
    );
    assert.equal(operatorFromTitle("How to Build AI Evals in 2026 (Step-by-Step, No Hype)"), "");
  });
});

describe("documentFromRaw", () => {
  it("parses a frontmatter file", () => {
    const doc = documentFromRaw({
      raw: frontmatterRaw,
      file: "lenny/newsletters/an-ai-glossary.md",
      publication: "Lenny's Newsletter & Podcast",
      kind: "newsletter",
    });

    assert.equal(doc.title, "An AI glossary");
    assert.equal(doc.date, "2025-06-24");
    assert.equal(doc.operator, "Ada Lovelace");
    assert.equal(doc.url, "https://www.lennysnewsletter.com/p/an-ai-glossary");
    assert.equal(doc.hasFrontmatter, true);
    assert.match(doc.body, /^You're probably hearing/);
    assert.doesNotMatch(doc.body, /^---/m);
    assert.equal(doc.hash.length, 64);
  });

  it("parses a header-only transcript", () => {
    const doc = documentFromRaw({
      raw: headerRaw,
      file: "aakash/How_to_Build_AI_Evals.md",
      publication: "Aakash Gupta",
      kind: "podcast",
    });

    assert.equal(doc.title, "How to Build AI Evals | Dianne Penn (Anthropic)");
    assert.equal(doc.operator, "Dianne Penn");
    assert.equal(doc.date, "");
    assert.equal(doc.url, "https://www.youtube.com/watch?v=abc123");
    assert.equal(doc.hasFrontmatter, false);
    assert.match(doc.body, /^### Intro/);
    assert.match(doc.body, /Hello from the transcript/);
    assert.doesNotMatch(doc.body, /# How to Build/);
    assert.doesNotMatch(doc.body, /\*\*Source:\*\*/);
    assert.doesNotMatch(doc.body, /## Transcript/);
  });

  it("parses an index-backed archive file and strips numeric folder prefixes", () => {
    assert.equal(resolveIndexFilename("03-podcasts/mark-pincus.md"), "podcasts/mark-pincus.md");
    assert.equal(
      resolveIndexFilename("02-newsletters/an-ai-glossary.md"),
      "newsletters/an-ai-glossary.md",
    );

    const doc = documentFromRaw({
      raw: indexedRaw,
      file: "lenny/podcasts/mark-pincus.md",
      publication: "Lenny's Newsletter & Podcast",
      kind: "podcast",
      indexed: true,
      indexEntry: {
        title: "The hidden pattern behind successful products | Mark Pincus (Founder of Zynga)",
        filename: "03-podcasts/mark-pincus.md",
        date: "2026-06-14",
        guest: "Mark Pincus",
        post_url: "https://www.lennysnewsletter.com/p/the-common-pattern-behind-successful",
      },
    });

    assert.equal(
      doc.title,
      "The hidden pattern behind successful products | Mark Pincus (Founder of Zynga)",
    );
    assert.equal(doc.date, "2026-06-14");
    assert.equal(doc.operator, "Mark Pincus");
    assert.equal(doc.kind, "podcast");
    assert.equal(
      doc.url,
      "https://www.lennysnewsletter.com/p/the-common-pattern-behind-successful",
    );
    assert.ok(doc.urls.includes("https://www.youtube.com/watch?v=archive"));
    assert.match(doc.body, /burn your resume/);
    assert.equal(doc.indexed, true);
  });
});

describe("publicationFor", () => {
  it("labels Lenny podcasts and newsletters separately", () => {
    assert.equal(
      publicationFor("lenny", "podcast", "podcasts/mark-pincus.md", "Lenny's Newsletter & Podcast"),
      "Lenny's Podcast",
    );
    assert.equal(
      publicationFor("lenny", "newsletter", "newsletters/an-ai-glossary.md", "Lenny's Newsletter & Podcast"),
      "Lenny's Newsletter",
    );
    assert.equal(
      publicationFor("lenny-transcripts", "podcast", "episode.md", "Lenny's Podcast"),
      "Lenny's Podcast",
    );
    assert.equal(publicationFor("aakash", "podcast", "episode.md", "Aakash Gupta"), "Aakash Gupta");
  });
});

describe("dedupeDocs", () => {
  it("keeps the archive copy when the title before the pipe and the operator match", () => {
    const archive = documentFromRaw({
      raw: indexedRaw,
      file: "lenny/podcasts/mark-pincus.md",
      publication: "Lenny's Newsletter & Podcast",
      kind: "podcast",
      indexed: true,
      indexEntry: {
        title: "The hidden pattern behind successful products | Mark Pincus (Founder of Zynga)",
        filename: "03-podcasts/mark-pincus.md",
        date: "2026-06-14",
        guest: "Mark Pincus",
        post_url: "https://www.lennysnewsletter.com/p/the-common-pattern",
      },
    });
    const transcript = documentFromRaw({
      raw: `# The hidden pattern behind successful products | Mark Pincus (FarmVille, Words with Friends, & more)

**Source:** https://www.youtube.com/watch?v=7eh9C3TUotc

## Transcript

Same conversation.
`,
      file: "lenny-transcripts/The_hidden_pattern_behind_successful_products_Mark_transcript.md",
      publication: "Lenny's Podcast",
      kind: "podcast",
    });

    const { docs, duplicates } = dedupeDocs([transcript, archive]);

    assert.deepEqual(
      docs.map((doc: LoadedDoc) => doc.file),
      ["lenny/podcasts/mark-pincus.md"],
    );
    assert.equal(duplicates.length, 1);
    assert.equal(
      duplicates[0]?.dropped,
      "lenny-transcripts/The_hidden_pattern_behind_successful_products_Mark_transcript.md",
    );
    assert.equal(duplicates[0]?.kept, "lenny/podcasts/mark-pincus.md");
    assert.match(duplicates[0]?.reason ?? "", /title/);
  });
});
