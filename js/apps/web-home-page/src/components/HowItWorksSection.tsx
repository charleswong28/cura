/**
 * HowItWorksSection — HP-069 through HP-071
 * EPIC-HP-010: How It Works Section
 *
 * HP-069: Section container — light background, eyebrow, headline, subline
 * HP-070: Three numbered step cards with icons + connecting dotted line
 * HP-071: Trust line — "Every AI action requires your approval…"
 */

const STEPS = [
  {
    number: "01",
    title: "Connect your accounts",
    description:
      "Open the Cura desktop app and sign into your LinkedIn, email, and calendar. Setup takes under 5 minutes.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 1 1 6.364 6.364l-1.757 1.757"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "AI goes to work",
    description:
      "Give Cura a job brief — or just the company name and title. It generates the spec, searches LinkedIn and talent databases, drafts personalised outreach, and starts the pipeline. Automatically.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "You close the deal",
    description:
      "Review the AI\u2019s work. Approve outreach with one click. Enter every candidate conversation with full context. Focus on the human connection that actually wins placements.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        />
      </svg>
    ),
  },
] as const;

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-padding bg-cura-cream">
      <div className="container-page">
        {/* HP-069: Eyebrow + headline + subline */}
        <div className="text-center mb-16 lg:mb-20">
          <p className="uppercase tracking-widest text-cura-accent font-semibold text-sm mb-4">
            How it works
          </p>
          <h2 className="font-sans font-semibold text-section-lg text-cura-black leading-tight mb-5">
            Set up. Let it work. Close deals.
          </h2>
          <p className="text-body-fluid text-cura-muted leading-relaxed max-w-135 mx-auto">
            Three steps between you and an AI recruiter that sources, outreaches, and follows up
            around the clock.
          </p>
        </div>

        {/* HP-070: Three step cards with connecting dotted line */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 mb-16 lg:mb-20">
          {/* Connecting dotted line — desktop only */}
          <div
            className="hidden lg:block absolute top-6 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] border-t-2 border-dashed border-cura-accent/25"
            aria-hidden="true"
          />

          {STEPS.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Number badge */}
              <div className="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl bg-cura-accent/10 border border-cura-accent/25 text-cura-accent mb-6">
                <span className="text-lg font-mono font-bold">{step.number}</span>
              </div>

              {/* Icon */}
              <div className="text-cura-accent/70 mb-4">{step.icon}</div>

              {/* Title */}
              <h3 className="font-semibold text-lg text-cura-black mb-3">{step.title}</h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-cura-muted max-w-xs">{step.description}</p>
            </div>
          ))}
        </div>

        {/* HP-071: Trust line */}
        <p className="text-center text-sm text-cura-muted italic">
          You choose which steps need your approval. Full control, no surprises.
        </p>
      </div>
    </section>
  );
}
