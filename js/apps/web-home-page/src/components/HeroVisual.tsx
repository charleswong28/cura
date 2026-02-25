/**
 * HeroVisual — HP-018, HP-019, HP-020
 *
 * Frosted-glass Kanban pipeline mockup rendered in the hero's right column.
 * A candidate card (Sam T.) auto-advances from Screened → Interviewing on a
 * 7-second loop:
 *   0 ms    idle   — Sam T. sits in Screened
 *   1 500ms highlight — card glows, "AI processing…" badge appears
 *   2 800ms moved  — Sam moves to Interviewing with "AI moved · just now" badge
 *   5 000ms tooltip fades out
 *   5 800ms reset to idle
 *   7 000ms loop restarts
 */
"use client";

import { useEffect, useState } from "react";

type Phase = "idle" | "highlight" | "moved";

export default function HeroVisual() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const run = () => {
      const t1 = setTimeout(() => setPhase("highlight"), 1500);
      const t2 = setTimeout(() => {
        setPhase("moved");
        setShowTooltip(true);
      }, 2800);
      const t3 = setTimeout(() => setShowTooltip(false), 5000);
      const t4 = setTimeout(() => setPhase("idle"), 5800);
      return [t1, t2, t3, t4];
    };

    let timers = run();
    const interval = setInterval(() => {
      timers.forEach(clearTimeout);
      timers = run();
    }, 7000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  const isMoved = phase === "moved";

  return (
    <div className="relative w-full max-w-[500px]">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-48px",
          background:
            "radial-gradient(ellipse at center, rgba(99,102,241,0.14) 0%, transparent 68%)",
          pointerEvents: "none",
        }}
      />

      {/* Frosted-glass pipeline card */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          backdropFilter: "blur(24px)",
          padding: "20px",
          boxShadow:
            "0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.08)",
          position: "relative",
        }}
      >
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#6366F1",
              }}
            />
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "rgba(245,245,243,0.40)" }}
            >
              Pipeline
            </span>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8" }}
          >
            Live
          </span>
        </div>

        {/* Kanban stage columns — 2 on mobile (Screened + Interview), 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="hidden md:block">
            <StageColumn
              label="Sourced"
              count={2}
              cards={[
                { name: "Alex M.", role: "CFO" },
                { name: "Jordan P.", role: "VP" },
              ]}
            />
          </div>

          <StageColumn
            label="Screened"
            count={isMoved ? 1 : 2}
            cards={
              isMoved
                ? [{ name: "Drew L.", role: "VP Fin" }]
                : [
                    {
                      name: "Sam T.",
                      role: "CFO",
                      highlight: phase === "highlight",
                    },
                    { name: "Drew L.", role: "VP Fin" },
                  ]
            }
          />

          <StageColumn
            label="Interview"
            count={isMoved ? 2 : 1}
            cards={
              isMoved
                ? [
                    { name: "Riley K.", role: "Dir." },
                    { name: "Sam T.", role: "CFO", isNew: true },
                  ]
                : [{ name: "Riley K.", role: "Dir." }]
            }
          />

          <div className="hidden md:block">
            <StageColumn
              label="Offer"
              count={1}
              cards={[{ name: "Casey L.", role: "CFO" }]}
            />
          </div>
        </div>

      </div>

      {/* HP-020: Toast notification — appears below the board */}
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(18,18,22,0.92)",
          border: "1px solid rgba(99,102,241,0.22)",
          borderRadius: "10px",
          padding: "10px 14px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          pointerEvents: "none",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          opacity: showTooltip ? 1 : 0,
          transform: showTooltip ? "translateY(0)" : "translateY(6px)",
        }}
      >
        {/* Indigo dot */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#6366F1",
            flexShrink: 0,
          }}
        />
        <p
          className="text-[11px] leading-snug"
          style={{ color: "rgba(245,245,243,0.65)", margin: 0 }}
        >
          Your Cura AI meeting notes are ready.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type CardData = {
  name: string;
  role: string;
  highlight?: boolean;
  isNew?: boolean;
};

function StageColumn({
  label,
  count,
  cards,
}: {
  label: string;
  count: number;
  cards: CardData[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between mb-1">
        <p
          className="text-[9px] font-semibold uppercase tracking-wider truncate"
          style={{ color: "rgba(245,245,243,0.28)", margin: 0 }}
        >
          {label}
        </p>
        <span
          className="text-[9px] tabular-nums"
          style={{ color: "rgba(245,245,243,0.18)" }}
        >
          {count}
        </span>
      </div>

      {cards.map((card, i) => (
        <CandidateCard key={`${card.name}-${i}`} {...card} />
      ))}
    </div>
  );
}

function CandidateCard({ name, role, highlight, isNew }: CardData) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("");

  return (
    <div
      style={{
        background: highlight
          ? "rgba(99,102,241,0.14)"
          : isNew
            ? "rgba(99,102,241,0.08)"
            : "rgba(255,255,255,0.03)",
        border: highlight
          ? "1px solid rgba(99,102,241,0.55)"
          : isNew
            ? "1px solid rgba(99,102,241,0.22)"
            : "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
        padding: "7px 8px",
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-1.5">
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "rgba(99,102,241,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{ fontSize: 7, fontWeight: 700, color: "#818CF8" }}
          >
            {initials}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            className="truncate"
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(245,245,243,0.85)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {name}
          </p>
          <p
            className="truncate"
            style={{
              fontSize: 8,
              color: "rgba(245,245,243,0.32)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {role}
          </p>
        </div>
      </div>

      {/* HP-019: "AI moved · just now" badge on the newly advanced card */}
      {isNew && (
        <div className="flex items-center gap-1 mt-1.5">
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#6366F1",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 7.5, color: "#818CF8" }}>
            AI moved · just now
          </span>
        </div>
      )}

      {/* "AI processing…" indicator while card is highlighted */}
      {highlight && (
        <div className="flex items-center gap-1 mt-1.5">
          <div
            className="animate-pulse"
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#6366F1",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 7.5, color: "#818CF8" }}>
            AI processing…
          </span>
        </div>
      )}
    </div>
  );
}
