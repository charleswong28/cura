/**
 * ComparisonSection — HP-038 through HP-043
 * Feature comparison table positioning Cura against three competitor archetypes,
 * plus an EU AI Act compliance callout card.
 */

import Link from "next/link";

type CellValue = "yes" | "no" | "partial" | "addon";

const CAPABILITIES: {
  label: string;
  legacy: CellValue;
  talent: CellValue;
  scale: CellValue;
  cura: CellValue;
}[] = [
  // HP-039: Rows derived from actual feature gaps identified in Q1 2026 research
  {
    label: "Autonomous pipeline movement",
    legacy: "no",
    talent: "partial",
    scale: "no",
    cura: "yes",
  },
  { label: "Zero-loss engagement memory", legacy: "no", talent: "no", scale: "no", cura: "yes" },
  {
    label: "Unified context (Zoom + email + LinkedIn)",
    legacy: "no",
    talent: "no",
    scale: "no",
    cura: "yes",
  },
  {
    label: "Human-in-the-loop approval gates",
    legacy: "no",
    talent: "no",
    scale: "no",
    cura: "yes",
  },
  { label: "Natural language search", legacy: "no", talent: "addon", scale: "no", cura: "yes" },
  { label: "Keyboard-first speed UX", legacy: "no", talent: "no", scale: "no", cura: "yes" },
  { label: "EU AI Act compliance-ready", legacy: "no", talent: "no", scale: "no", cura: "yes" },
  { label: "Boutique-friendly pricing", legacy: "no", talent: "no", scale: "no", cura: "yes" },
  {
    label: "Full lifecycle: source → offer",
    legacy: "partial",
    talent: "partial",
    scale: "yes",
    cura: "yes",
  },
];

function Cell({ value, isCura = false }: { value: CellValue; isCura?: boolean }) {
  if (value === "yes") {
    return (
      <span
        className={isCura ? "text-cura-accent text-lg font-bold" : "text-cura-white/30 text-base"}
        aria-label="Yes"
      >
        ✓
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="text-cura-white/15 text-base" aria-label="No">
        ✗
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="text-amber-500/55 text-mock-base font-medium tracking-wide">partial</span>
    );
  }
  if (value === "addon") {
    return (
      <span className="text-amber-500/55 text-mock-base font-medium tracking-wide">
        paid add-on
      </span>
    );
  }
  return null;
}

export default function ComparisonSection() {
  return (
    <section id="comparison" className="section-padding bg-cura-black">
      <div className="container-page">
        {/* HP-038: Section headline — centred, serif */}
        <div className="text-center mb-14 lg:mb-18">
          <h2 className="font-sans font-semibold text-section-lg text-cura-white leading-tight mx-auto max-w-3xl">
            Recruitment CRMs were built for the 2010s.
            <br />
            <span className="text-gradient-accent">Cura is built for now.</span>
          </h2>
          <p className="mt-4 text-body-fluid text-cura-muted mx-auto leading-relaxed">
            Compare the capabilities that actually move the needle for modern recruitment firms.
          </p>
        </div>

        {/* HP-039 + HP-040: Comparison table — HP-040 Cura column styled with indigo */}
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <table className="w-full min-w-170 border-collapse">
            <thead>
              <tr>
                {/* Capability label column */}
                <th className="text-left pb-5 pr-8 text-cura-muted text-xs font-semibold uppercase tracking-widest w-[40%]">
                  Capability
                </th>

                {/* Legacy Enterprise — Bullhorn archetype */}
                <th className="pb-5 px-4 text-center text-cura-white/30 text-xs font-semibold uppercase tracking-wider">
                  Legacy
                  <br />
                  Enterprise
                </th>

                {/* AI Recruiting Platform — Loxo archetype */}
                <th className="pb-5 px-4 text-center text-cura-white/30 text-xs font-semibold uppercase tracking-wider">
                  AI Recruiting
                  <br />
                  Platform
                </th>

                {/* Agency All-in-One — RecruitCRM archetype */}
                <th className="pb-5 px-4 text-center text-cura-white/30 text-xs font-semibold uppercase tracking-wider">
                  Agency
                  <br />
                  All-in-One
                </th>

                {/* HP-040: Cura column — indigo header, visually dominant */}
                <th className="pb-5 px-4 text-center">
                  <span className="inline-block bg-cura-accent text-white text-xs font-bold px-5 py-2 rounded-full tracking-wider uppercase shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                    Cura
                  </span>
                </th>
              </tr>

              {/* Divider row */}
              <tr aria-hidden="true">
                <td colSpan={5}>
                  <div className="h-px bg-white/8 mb-1" />
                </td>
              </tr>
            </thead>

            <tbody>
              {CAPABILITIES.map((cap, i) => (
                <tr
                  key={cap.label}
                  className={`border-b border-white/[0.06] last:border-b-0 transition-colors hover:bg-white/[0.02] ${
                    i % 2 === 0 ? "" : "bg-white/[0.018]"
                  }`}
                >
                  {/* Capability label */}
                  <td className="py-4 pr-8 text-sm text-cura-white/65 leading-snug">{cap.label}</td>

                  {/* Legacy Enterprise */}
                  <td className="py-4 px-4 text-center">
                    <Cell value={cap.legacy} />
                  </td>

                  {/* Talent Intelligence */}
                  <td className="py-4 px-4 text-center">
                    <Cell value={cap.talent} />
                  </td>

                  {/* Scale & Volume */}
                  <td className="py-4 px-4 text-center">
                    <Cell value={cap.scale} />
                  </td>

                  {/* HP-040: Cura — indigo checkmarks, visually dominant */}
                  <td className="py-4 px-4 text-center bg-cura-accent/4 border-x border-cura-accent/10">
                    <Cell value={cap.cura} isCura />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* HP-041: Footnote */}
        <p className="mt-5 text-xs text-cura-muted/50 leading-relaxed">
          *Based on publicly documented product capabilities as of Q1 2026. &lsquo;AI Recruiting
          Platform&rsquo; Basic plan starts at $169/seat/month; AI features require Professional
          (custom pricing).
        </p>

        {/* HP-042: Compliance Badge */}
        <div className="mt-14 flex justify-center">
          <div className="rounded-2xl border border-cura-accent/20 bg-cura-accent/4 p-6 max-w-lg w-full flex gap-5 items-start">
            {/* Shield icon */}
            <div className="shrink-0 w-11 h-11 rounded-xl bg-cura-accent/15 border border-cura-accent/25 flex items-center justify-center text-xl">
              🛡️
            </div>

            <div>
              <h3 className="text-cura-white font-semibold text-sm mb-1.5">
                EU AI Act compliant by design.
              </h3>
              <p className="text-cura-muted text-sm leading-relaxed">
                Built-in audit trails, transparent decision logic, and bias safeguards — before the
                August 2026 deadline.
              </p>
              {/* HP-043: Link to /compliance placeholder */}
              <Link
                href="/compliance"
                className="inline-flex items-center gap-1.5 mt-3 text-cura-accent-soft text-xs font-medium hover:text-cura-accent transition-colors duration-200"
              >
                Learn about our compliance approach
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
