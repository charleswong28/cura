/**
 * ProblemSection — HP-021 through HP-024
 * EPIC-HP-003: The Problem Section
 *
 * HP-021: Section container with cream background
 * HP-022: Centred headline — "Your competitors close deals..."
 * HP-023: Four pain-point cards (icon · bold label · one-sentence description)
 * HP-024: Italic pull-quote — "Your instinct is your edge. But admin is eating it alive."
 */

const PAIN_CARDS = [
  {
    icon: "⚡",
    label: "The Endless Click",
    description: "11 clicks to move a candidate in most ATS tools. We counted.",
  },
  {
    icon: "🧠",
    label: "Context Amnesia",
    description:
      "You switch between email, LinkedIn, and CRM and lose the thread every single time.",
  },
  {
    icon: "⏱",
    label: "Slow = Lost",
    description:
      "The recruiter who replies in minutes places the candidate. You're still searching the inbox.",
  },
  {
    icon: "💸",
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
        <h2 className="font-sans font-semibold text-section-lg text-cura-black text-center leading-tight mx-auto mb-16 lg:mb-20 max-w-3xl">
          Your competitors close deals while you&apos;re updating spreadsheets.
        </h2>

        {/* HP-023: Pain-point grid — 1 col → 2 col → 4 col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20 lg:mb-28">
          {PAIN_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-6 flex flex-col gap-4 bg-white border border-cura-border-light"
            >
              <span className="text-3xl leading-none" aria-hidden="true">
                {card.icon}
              </span>
              <h3 className="font-semibold text-base leading-snug text-cura-black">
                {card.label}
              </h3>
              <p className="text-sm leading-relaxed text-cura-muted">
                {card.description}
              </p>
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
