"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/browse", label: "Library" },
  { href: "/find", label: "Find" },
  { href: "/learn", label: "Learn" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          AI PM Eval Library
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "relative text-blue-600 after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-400"
                    : "text-slate-700 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                }
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
