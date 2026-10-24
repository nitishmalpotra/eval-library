import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = dirname(fileURLToPath(import.meta.url));

function legacyEvalRedirects(): Array<{ source: string; destination: string; permanent: true }> {
  const redirectsPath = join(__dirname, "data", "id-redirects.json");

  if (!existsSync(redirectsPath)) {
    return [];
  }

  const parsed: unknown = JSON.parse(readFileSync(redirectsPath, "utf8"));

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }

  return Object.entries(parsed).flatMap(([from, to]) => {
    if (typeof to !== "string" || from.length === 0 || from === to) {
      return [];
    }

    return [
      {
        source: `/eval/${from}`,
        destination: `/eval/${to}`,
        permanent: true as const,
      },
    ];
  });
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async redirects() {
    return legacyEvalRedirects();
  },
};

export default nextConfig;
