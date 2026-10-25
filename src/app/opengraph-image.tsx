import { ImageResponse } from "next/og";
import { getHeroStats } from "@/lib/fieldGuide";

export const alt = "The AI Eval Field Guide";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const stats = getHeroStats();
  const patterns = stats.find((stat) => stat.label === "Patterns")?.value ?? 0;
  const publications = stats.find((stat) => stat.label === "Publications")?.value ?? 0;
  const font = await frauncesFont();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#FAF8F3",
          backgroundImage:
            "linear-gradient(#E7E1D4 1px, transparent 1px), linear-gradient(90deg, #E7E1D4 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          borderLeft: "16px solid #D9480F",
          color: "#1C1B19",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", fontFamily: font ? "Fraunces" : "Georgia", fontSize: 68, lineHeight: 1.05 }}>
          The AI Eval Field Guide
        </div>
        <div style={{ display: "flex", width: 168, height: 4, marginTop: 28, backgroundColor: "#D9480F" }} />
        <div style={{ display: "flex", maxWidth: 860, marginTop: 28, fontSize: 28, lineHeight: 1.35 }}>
          Eval patterns from the people who ship AI, sourced, cited, and ready to use.
        </div>
        <div style={{ display: "flex", marginTop: 36, color: "#6B665C", fontSize: 24 }}>
          {patterns} patterns · {publications} publications
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Fraunces", data: font, style: "normal", weight: 400 }] : undefined,
    },
  );
}

async function frauncesFont() {
  try {
    const response = await fetch("https://cdn.jsdelivr.net/fontsource/fonts/fraunces@5.2.8/latin-400-normal.ttf");
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}
