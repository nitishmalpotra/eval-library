"use client";

import { useState } from "react";

export function PromptTemplateCopier({ prompt }: { prompt: string }) {
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
    <div className="recipe">
      <div className="recipe-bar">
        <span>Recipe</span>
        <button type="button" onClick={handleCopy} className="recipe-copy">
          <span key={copied ? "copied" : "copy"} className="copy-label" aria-live="polite">
            {copied ? "Copied ✓" : "Copy"}
          </span>
        </button>
      </div>
      <pre>
        <code>{prompt}</code>
      </pre>
    </div>
  );
}
