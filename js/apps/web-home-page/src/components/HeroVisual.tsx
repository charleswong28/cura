/**
 * HeroVisual — HP-067, HP-068 (V2 rework)
 *
 * "AI recruiter at work" dashboard mockup replacing the V1 pipeline Kanban.
 * Dark frosted-glass card showing:
 *   - Top bar: "Cura AI — Working" with green pulse dot
 *   - Activity feed: 5 lines appearing with staggered fade-in, mirroring the
 *     real recruiter workflow the AI handles autonomously:
 *       1. Generated job spec (from a title)
 *       2. Searched talent databases
 *       3. Found & ranked candidates
 *       4. Drafted personalised outreach
 *       5. Awaiting human approval (the only human step)
 *   - Caption below: "Set up once. It never stops working."
 *
 * Animation loops every 10s: lines fade in every 1s, hold ~4s, then reset.
 */
"use client";

import { useAnimationPhases } from "@/hooks/useAnimationPhases";

/*
 * Phase timings (ms from loop start):
 *   0=reset, 600=line1, 1600=line2, 2600=line3, 3600=line4, 4600=line5, 8500=fade-out
 * All 5 lines appear within 4.6s. Line 5 holds for ~4s before fade-out.
 * Loop: 10000ms
 */
const TIMINGS = [0, 600, 1600, 2600, 3600, 4600, 8500] as const;
const LOOP_MS = 10000;

const ACTIVITY_LINES = [
  { icon: "✓", text: 'Generated job spec from "CFO, Series B fintech"', accent: false },
  { icon: "✓", text: "Searched LinkedIn & 3 talent databases", accent: false },
  { icon: "✓", text: "Found 23 candidates in London — ranked by fit", accent: false },
  { icon: "✓", text: "Drafted 15 personalised outreach messages", accent: false },
  { icon: "⏳", text: "Awaiting your approval (15 messages)", accent: true },
] as const;

export default function HeroVisual() {
  const phaseIdx = useAnimationPhases(TIMINGS, LOOP_MS);

  /* Lines visible: phase 0 = none, 1 = first, ..., 5 = all five, 6 = fade-out (none) */
  const visibleLines = phaseIdx === 0 || phaseIdx === 6 ? 0 : Math.min(phaseIdx, 5);

  return (
    <div className="relative w-full max-w-96">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden="true"
        className="absolute -inset-12 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.14)_0%,transparent_68%)]"
      />

      {/* Frosted-glass dashboard card — always visible, only lines animate */}
      <div className="frosted-card relative p-5 shadow-[0_32px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(99,102,241,0.08)]">
        {/* Top bar: "Cura AI — Working" */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="relative w-2 h-2">
            <div className="absolute inset-0 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-cura-white/70">
            Cura AI
          </span>
          <span className="text-[11px] text-cura-white/30">—</span>
          <span className="text-[11px] font-medium text-emerald-400/80">Working</span>
        </div>

        {/* Activity feed — 5 lines with staggered fade-in (recruiter workflow) */}
        <div className="flex flex-col gap-2.5 min-h-50">
          {ACTIVITY_LINES.map((line, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-lg px-3 py-2 transition-all duration-500 ${
                line.accent
                  ? "bg-cura-accent/10 border border-cura-accent/25"
                  : "bg-white/[3%] border border-white/[6%]"
              }`}
              style={{
                opacity: i < visibleLines ? 1 : 0,
                transform: i < visibleLines ? "translateY(0)" : "translateY(8px)",
              }}
            >
              <span
                className={`text-sm leading-none mt-0.5 shrink-0 ${
                  line.accent ? "text-cura-accent-soft" : "text-emerald-400"
                }`}
              >
                {line.icon}
              </span>
              <span
                className={`text-[11px] leading-snug ${
                  line.accent ? "text-cura-accent-soft font-medium" : "text-cura-white/65"
                }`}
              >
                {line.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* HP-068: Caption below the visual */}
      <p className="mt-4 text-center text-xs italic text-cura-white/30">
        Set up once. It never stops working.
      </p>
    </div>
  );
}
