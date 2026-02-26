/**
 * ValuePropsSection — HP-025 through HP-031
 * Layout orchestrator: maps PILLARS data to alternating text/visual rows.
 * Each visual component lives in its own file under value-props/.
 */
import { PipelineVisual } from "./value-props/PipelineVisual";
import { TimelineVisual } from "./value-props/TimelineVisual";
import { ApprovalVisual } from "./value-props/ApprovalVisual";
import { SpeedBanner } from "./value-props/SpeedBanner";

type PillarId = "pipeline" | "memory" | "hitl";

const PILLARS: {
  id: PillarId;
  label: string;
  headline: string;
  subtext: string;
  reverse: boolean;
}[] = [
  {
    id: "pipeline",
    label: "Autonomous Pipeline",
    headline: "AI that moves the deal.",
    subtext:
      "Cura reads your meeting notes and emails. When a candidate is interviewed, their stage advances and a briefing note is ready — before you've had coffee.",
    reverse: false,
  },
  {
    id: "memory",
    label: "Zero-Loss Memory",
    headline: "Every signal. One timeline.",
    subtext:
      "LinkedIn replies, Zoom transcripts, email opens — everything is synthesized into a single, permanent record. Enter every conversation knowing exactly where things stand.",
    reverse: true,
  },
  {
    id: "hitl",
    label: "Human-in-the-Loop",
    headline: "AI drafts. You decide.",
    subtext:
      "No autonomous sending. No hallucination risk. For every high-stakes action — client submission, offer, key message — Cura presents a draft and waits for your approval.",
    reverse: false,
  },
];

function PillarVisual({ id }: { id: PillarId }) {
  if (id === "pipeline") return <PipelineVisual />;
  if (id === "memory") return <TimelineVisual />;
  if (id === "hitl") return <ApprovalVisual />;
}

export default function ValuePropsSection() {
  return (
    <section>
      <SpeedBanner />
      {PILLARS.map((pillar, i) => (
        <div key={pillar.id} id={i === 0 ? "product" : undefined}>
          <div className="section-padding min-h-[70vh] flex items-center bg-cura-cream">
            <div className="container-page w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">
                {/* Text block — HP-029: indigo left-border accent line */}
                <div className={pillar.reverse ? "lg:order-2" : "lg:order-1"}>
                  <div className="border-l-[3px] border-cura-accent pl-6">
                    <div className="text-mock-base uppercase tracking-widest text-cura-accent font-semibold mb-3">
                      {pillar.label}
                    </div>
                    <h2 className="text-pillar font-bold text-cura-black leading-[1.1] mb-5">
                      {pillar.headline}
                    </h2>
                    <p className="text-body-fluid text-cura-muted leading-[1.7] max-w-120">
                      {pillar.subtext}
                    </p>
                  </div>
                </div>

                {/* Visual block — HP-029 */}
                <div className={pillar.reverse ? "lg:order-1" : "lg:order-2"}>
                  <PillarVisual id={pillar.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
