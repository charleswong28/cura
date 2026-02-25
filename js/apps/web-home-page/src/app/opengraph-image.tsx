import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cura — AI-First Recruitment CRM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 100px",
          fontFamily: "Georgia, serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "200px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#6366F1",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "Arial, sans-serif",
            marginBottom: "48px",
          }}
        >
          CURA
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: "88px",
            fontWeight: 400,
            color: "#F5F5F3",
            lineHeight: 1.05,
            marginBottom: "12px",
          }}
        >
          Stop Clicking.
        </div>
        <div
          style={{
            fontSize: "88px",
            fontWeight: 400,
            color: "#818CF8",
            lineHeight: 1.05,
            marginBottom: "40px",
          }}
        >
          Start Connecting.
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: "24px",
            color: "#A1A1AA",
            maxWidth: "700px",
            lineHeight: 1.5,
            fontFamily: "Arial, sans-serif",
            fontWeight: 400,
          }}
        >
          AI handles the administrative heavy lifting — so recruiters can focus on what AI can't replicate: human connection.
        </div>

        {/* Bottom accent rule */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "100%",
            height: "4px",
            background: "linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, transparent 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
