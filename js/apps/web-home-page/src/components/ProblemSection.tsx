/**
 * ProblemSection — HP-021 through HP-024
 * EPIC-HP-003: The Problem Section
 *
 * HP-021: Section container with cream background
 * HP-022: Centred headline — "Your competitors close deals..."
 * HP-023: Four pain-point cards — numbered accent badge + top accent border line
 * HP-024: Italic pull-quote — "Your instinct is your edge. But admin is eating it alive."
 */

const PAIN_CARDS = [
  {
    index: "01",
    label: "The Endless Click",
    description: "11 clicks to move a candidate in most ATS tools. We counted.",
  },
  {
    index: "02",
    label: "Context Amnesia",
    description:
      "You switch between email, LinkedIn, and CRM and lose the thread every single time.",
  },
  {
    index: "03",
    label: "Slow = Lost",
    description:
      "The recruiter who replies in minutes places the candidate. You're still searching the inbox.",
  },
  {
    index: "04",
    label: "The Tool Tax",
    description:
      "ATS. Outreach tool. Enrichment API. LinkedIn Recruiter. You're paying for four tools and managing five context switches — daily.",
  },
] as const;

export default function ProblemSection() {
  return (
    <section id="why-cura" className="section-padding bg-cura-cream">
      <div className="container-page">
        {/* HP-022: Centred headline */}
        <h2 className="font-sans font-semibold text-section-lg text-cura-black text-center leading-tight mx-auto mb-16 lg:mb-20">
          Your competitors close deals <br />
          while you&apos;re updating spreadsheets.
        </h2>

        {/* HP-023: Pain-point grid — 1 col → 2 col → 4 col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20 lg:mb-28">
          {PAIN_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-6 flex flex-col gap-4 bg-white border-t-2 border border-cura-accent/40 border-t-cura-accent shadow-sm"
            >
              {/* Numbered index badge */}
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cura-accent/8 border border-cura-accent/20 text-cura-accent text-xs font-mono font-semibold self-start">
                {card.index}
              </span>

              <h3 className="font-semibold text-base leading-snug text-cura-black">{card.label}</h3>
              <p className="text-sm leading-relaxed text-cura-muted">{card.description}</p>
            </div>
          ))}
        </div>

        {/* HP-024: Pull-quote */}
        <p className="font-sans text-pull-quote text-cura-black/35 text-center italic mx-auto">
          &ldquo;Your instinct is your edge. But admin is eating it alive.&rdquo;
        </p>
      </div>
    </section>
  );
}
