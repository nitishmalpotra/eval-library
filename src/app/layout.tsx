import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/Providers";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "The AI Eval Field Guide",
    template: "%s · The AI Eval Field Guide",
  },
  description: "Eval patterns from the people who ship AI, sourced, cited, and ready to use.",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

function getMetadataBase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-ink">
        <Providers>
          <SiteNav />
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                The AI Eval Field Guide · Built by{" "}
                <a
                  href="https://www.linkedin.com/in/nitishmalpotra/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline decoration-rule underline-offset-4 hover:decoration-accent"
                >
                  Nitish Malpotra
                </a>
              </p>
              <div className="flex gap-4">
                <Link href="/about" className="hover:text-ink">
                  About
                </Link>
                <a href={process.env.NEXT_PUBLIC_REPO_URL ?? "#"} className="hover:text-ink">
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
