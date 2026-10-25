import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">404</p>
      <h1 className="mt-4 max-w-[14ch] text-4xl tracking-tight text-ink">This page fell out of the notebook.</h1>
      <Link href="/" className="mt-6 text-sm text-ink underline decoration-accent underline-offset-4">
        Back to the front
      </Link>
    </main>
  );
}
