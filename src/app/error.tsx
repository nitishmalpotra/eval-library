"use client";

import Link from "next/link";

export default function ErrorPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-start px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Error</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Something went sideways.
      </h1>
      <Link href="/" className="mt-6 text-sm text-blue-600 dark:text-blue-400">
        Back to home →
      </Link>
    </main>
  );
}
