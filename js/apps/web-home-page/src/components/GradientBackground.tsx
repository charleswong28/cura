/**
 * GradientBackground
 *
 * Fixed full-page layer of radial gradient blobs (indigo/violet, low opacity)
 * floating over the #0A0A0A base. Rendered once in the root layout so it
 * persists across all sections without repainting.
 *
 * z-index: -1 ensures blobs sit behind all page content.
 * pointer-events: none ensures it never captures clicks.
 */
export default function GradientBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Top-right — indigo */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-5%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "blob-float 18s ease-in-out infinite",
        }}
      />

      {/* Bottom-left — violet */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "-8%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
          filter: "blur(50px)",
          animation: "blob-float-alt 22s ease-in-out infinite",
          animationDelay: "-7s",
        }}
      />

      {/* Centre — indigo/violet blend */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "30%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "blob-float 26s ease-in-out infinite",
          animationDelay: "-13s",
        }}
      />
    </div>
  );
}
