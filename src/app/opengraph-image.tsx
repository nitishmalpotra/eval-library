import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#020617",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "64px",
          width: "100%",
        }}
      >
        <div style={{ color: "#60a5fa", fontSize: 28, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Lenny&apos;s operators
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 24 }}>AI PM Eval Library</div>
        <div style={{ color: "#cbd5e1", fontSize: 30, marginTop: 18 }}>
          Every AI eval pattern from Lenny&apos;s operators, made buildable.
        </div>
      </div>
    ),
    size,
  );
}
