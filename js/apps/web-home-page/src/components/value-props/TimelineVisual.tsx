/**
 * TimelineVisual — static activity feed for the "Zero-Loss Memory" pillar (HP-027).
 */
import { IconBadge } from "./IconBadge";

const TIMELINE_ENTRIES = [
  {
    icon: "💼",
    label: "LinkedIn",
    detail: "Alex replied to your InMail",
    time: "9:14 am",
  },
  {
    icon: "🎥",
    label: "Zoom",
    detail: "Transcript analysed — 3 key signals flagged",
    time: "10:30 am",
  },
  {
    icon: "📧",
    label: "Email",
    detail: "Follow-up opened ×2 — no reply yet",
    time: "11:48 am",
  },
  {
    icon: "📅",
    label: "Calendar",
    detail: "Interview confirmed — Fri 14:00",
    time: "2:03 pm",
  },
] as const;

export function TimelineVisual() {
  return (
    <div className="dark-panel">
      <IconBadge>🧠 Zero-Loss Memory</IconBadge>

      <div className="text-mock-xl text-cura-white/45 mb-3 font-medium">
        Alex Novak · CFO Search · Today
      </div>

      <div className="flex flex-col gap-[0.6rem]">
        {TIMELINE_ENTRIES.map((entry, i) => (
          <div
            key={i}
            className="flex gap-[0.7rem] items-start py-[0.6rem] px-3 bg-white/5 border border-white/10 rounded-lg"
          >
            <span className="text-base shrink-0 leading-[1.4]">{entry.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-mock-base font-semibold text-cura-white/75">
                  {entry.label}
                </span>
                <span className="text-mock-xs text-cura-white/30 shrink-0">
                  {entry.time}
                </span>
              </div>
              <p className="text-mock-md text-cura-white/50 mt-[0.15rem] leading-[1.4]">
                {entry.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
