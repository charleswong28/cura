/**
 * PipelineVisual — animated Kanban for the "Autonomous Pipeline" pillar (HP-026).
 * Sam T. cycles idle → moving → done on a 7.5 s loop.
 */
"use client";

import { useAnimationPhases } from "@/hooks/useAnimationPhases";
import { IconBadge } from "./IconBadge";

const TIMINGS = [0, 1800, 3000] as const;
const LOOP_MS = 7500;

function ColLabel({ text }: { text: string }) {
  return (
    <div className="text-mock-sm text-cura-white/35 uppercase tracking-[0.07em] mb-2 font-semibold">
      {text}
    </div>
  );
}

function CandidateCard({
  name,
  role,
  glow = false,
  badge,
}: {
  name: string;
  role: string;
  glow?: boolean;
  badge?: string;
}) {
  const stateClass = glow
    ? "bg-cura-accent/14 border-cura-accent/50"
    : "bg-white/7 border-white/10";

  return (
    <div
      className={`${stateClass} border rounded-[0.4rem] py-[0.6rem] px-[0.7rem] mb-[0.4rem] [transition:background_0.4s_ease,border-color_0.4s_ease]`}
    >
      <div className="text-mock-base font-semibold text-cura-white/85">{name}</div>
      <div className="text-mock-xs text-cura-white/40">{role}</div>
      {badge && (
        <div className="mt-[0.3rem] text-mock-2xs text-cura-accent-soft font-semibold">
          ✦ {badge}
        </div>
      )}
    </div>
  );
}

export function PipelineVisual() {
  const phaseIdx = useAnimationPhases(TIMINGS, LOOP_MS);
  const phases = ["idle", "moving", "done"] as const;
  const phase = phases[phaseIdx] ?? "idle";

  return (
    <div className="dark-panel">
      <IconBadge>⚡ Autonomous Pipeline</IconBadge>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Sourced — hidden on mobile */}
        <div className="hidden lg:block">
          <ColLabel text="Sourced" />
          <CandidateCard name="Priya M." role="CFO Search" />
          <CandidateCard name="Tom B." role="VP Ops" />
        </div>

        {/* Screened — Sam moves out on 'done' */}
        <div>
          <ColLabel text="Screened" />
          {phase !== "done" && (
            <CandidateCard
              name="Sam T."
              role="Exec Search"
              glow={phase === "moving"}
              badge={phase === "moving" ? "AI processing…" : undefined}
            />
          )}
          <CandidateCard name="Jordan L." role="Fin Dir." />
        </div>

        {/* Interviewing — Sam arrives on 'done' */}
        <div>
          <ColLabel text="Interview" />
          <CandidateCard name="Maria C." role="CTO Search" />
          {phase === "done" && (
            <CandidateCard name="Sam T." role="Exec Search" badge="AI moved · just now" />
          )}
        </div>

        {/* Offer — hidden on mobile */}
        <div className="hidden lg:block">
          <ColLabel text="Offer" />
          <CandidateCard name="Ravi P." role="VP Eng" />
        </div>
      </div>

      {/* Tooltip — appears when card moves (HP-026 visual) */}
      <div
        className="mt-[0.9rem] py-[0.6rem] px-[0.85rem] bg-cura-accent/10 border border-cura-accent/22 rounded-lg text-mock-lg text-cura-white/75 transition-opacity duration-[400ms]"
        style={{ opacity: phase === "done" ? 1 : 0 }}
      >
        💡 Your Cura AI meeting notes are ready.
      </div>
    </div>
  );
}
