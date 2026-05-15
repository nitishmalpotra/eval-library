"use client";

import { useState } from "react";

export function CodexPromptCopier({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-slate-400">Codex prompt</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-white/15 px-3 py-1 text-sm text-slate-200 transition hover:border-white/30 hover:bg-white/10"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap p-4 text-sm leading-6">
        <code>{prompt}</code>
      </pre>
    </div>
  );
}
