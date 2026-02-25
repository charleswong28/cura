/**
 * HeroVisual — HP-018, HP-019, HP-020
 *
 * Frosted-glass Kanban pipeline mockup rendered in the hero's right column.
 * A candidate card (Sam T.) auto-advances from Screened → Interviewing on a
 * 7-second loop:
 *   phase 0 (0 ms)    idle      — Sam T. sits in Screened
 *   phase 1 (1 500ms) highlight — card glows, "AI processing…" badge appears
 *   phase 2 (2 800ms) moved     — Sam moves to Interviewing, tooltip visible
 *   phase 3 (5 000ms) moved     — tooltip fades out
 *   phase 4 (5 800ms) idle      — reset
 *   phase 0 (7 000ms) loop restarts
 */
"use client";

import { useAnimationPhases } from "@/hooks/useAnimationPhases";

type Phase = "idle" | "highlight" | "moved";

const TIMINGS = [0, 1500, 2800, 5000, 5800] as const;
const LOOP_MS = 7000;

const HERO_CANDIDATES = {
  alex: { name: "Alex M.", role: "CFO" },
  jordan: { name: "Jordan P.", role: "VP" },
  sam: { name: "Sam T.", role: "CFO" },
  drew: { name: "Drew L.", role: "VP Fin" },
  riley: { name: "Riley K.", role: "Dir." },
  casey: { name: "Casey L.", role: "CFO" },
} as const;

export default function HeroVisual() {
  const phaseIdx = useAnimationPhases(TIMINGS, LOOP_MS);

  const phase: Phase =
    phaseIdx === 1 ? "highlight" : phaseIdx === 2 || phaseIdx === 3 ? "moved" : "idle";
  const showTooltip = phaseIdx === 2;
  const isMoved = phase === "moved";

  return (
    <div className="relative w-full max-w-[500px]">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden="true"
        className="absolute inset-[-48px] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.14)_0%,transparent_68%)]"
      />

      {/* Frosted-glass pipeline card */}
      <div className="frosted-card relative p-5 shadow-[0_32px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(99,102,241,0.08)]">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cura-accent" />
            <span className="text-[9px] font-semibold tracking-widest uppercase text-cura-white/40">
              Pipeline
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-cura-accent/12 text-cura-accent-soft">
            Live
          </span>
        </div>

        {/* Kanban stage columns — 2 on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="hidden md:block">
            <StageColumn
              label="Sourced"
              count={2}
              cards={[HERO_CANDIDATES.alex, HERO_CANDIDATES.jordan]}
            />
          </div>

          <StageColumn
            label="Screened"
            count={isMoved ? 1 : 2}
            cards={
              isMoved
                ? [HERO_CANDIDATES.drew]
                : [
                    { ...HERO_CANDIDATES.sam, highlight: phase === "highlight" },
                    HERO_CANDIDATES.drew,
                  ]
            }
          />

          <StageColumn
            label="Interview"
            count={isMoved ? 2 : 1}
            cards={
              isMoved
                ? [HERO_CANDIDATES.riley, { ...HERO_CANDIDATES.sam, isNew: true }]
                : [HERO_CANDIDATES.riley]
            }
          />

          <div className="hidden md:block">
            <StageColumn label="Offer" count={1} cards={[HERO_CANDIDATES.casey]} />
          </div>
        </div>
      </div>

      {/* HP-020: Toast notification */}
      <div
        className="mt-3 flex items-center gap-[10px] bg-[rgba(18,18,22,0.92)] border border-cura-accent/22 rounded-[10px] py-2.5 px-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] pointer-events-none [transition:opacity_0.4s_ease,transform_0.4s_ease]"
        style={{
          opacity: showTooltip ? 1 : 0,
          transform: showTooltip ? "translateY(0)" : "translateY(6px)",
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-cura-accent shrink-0" />
        <p className="text-[11px] leading-snug text-cura-white/65 m-0">
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
        <p className="text-[9px] font-semibold uppercase tracking-wider truncate text-cura-white/28 m-0">
          {label}
        </p>
        <span className="text-[9px] tabular-nums text-cura-white/18">{count}</span>
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

  const stateClass = highlight
    ? "bg-cura-accent/14 border-cura-accent/55"
    : isNew
      ? "bg-cura-accent/8 border-cura-accent/22"
      : "bg-white/3 border-white/[6%]";

  return (
    <div
      className={`${stateClass} border rounded-lg py-[7px] px-2 [transition:background_0.4s_ease,border-color_0.4s_ease]`}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-cura-accent/22 flex items-center justify-center shrink-0">
          <span className="text-[7px] font-bold text-cura-accent-soft">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold text-cura-white/85 m-0 leading-[1.3]">
            {name}
          </p>
          <p className="truncate text-[8px] text-cura-white/32 m-0 leading-[1.3]">{role}</p>
        </div>
      </div>

      {/* HP-019: "AI moved · just now" badge */}
      {isNew && (
        <div className="flex items-center gap-1 mt-1.5">
          <div className="w-1 h-1 rounded-full bg-cura-accent shrink-0" />
          <span className="text-[7.5px] text-cura-accent-soft">AI moved · just now</span>
        </div>
      )}

      {/* "AI processing…" indicator */}
      {highlight && (
        <div className="flex items-center gap-1 mt-1.5">
          <div className="w-1 h-1 rounded-full bg-cura-accent shrink-0 animate-pulse" />
          <span className="text-[7.5px] text-cura-accent-soft">AI processing…</span>
        </div>
      )}
    </div>
  );
}
