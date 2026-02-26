/**
 * PricingTeaser — HP-054 through HP-056
 *
 * Four-tier freemium model: Free · Starter · Pro · Enterprise
 * HP-054: Multi-column plan cards
 * HP-055: CTAs linking to waitlist
 * HP-056: "No contracts. No seat minimums."
 */

const PLANS = [
  {
    tier: "Free",
    label: "Solo Recruiter",
    price: "£0",
    period: "forever",
    description: "Test the full AI experience with no commitment.",
    cta: "Start for free",
    ctaHref: "#waitlist",
    credits: "500 AI credits / mo",
    features: ["1 seat", "50 candidates", "1 active job", "AI match scoring", "Cura branding"],
    note: "No credit card required.",
  },
  {
    tier: "Starter",
    label: "Boutique",
    price: "£149",
    period: "/user/mo",
    description: "For small agencies ready to replace their stack.",
    cta: "Join the waitlist",
    ctaHref: "#waitlist",
    credits: "3,000 AI credits / mo",
    features: [
      "Unlimited candidates & jobs",
      "Email & LinkedIn sync",
      "Basic pipeline automations",
      "Natural language search",
      "Keyboard-first UI",
    ],
    note: "3,000 credits included — top up at £10/1,000.",
  },
  {
    tier: "Pro",
    label: "Scaling Agency",
    price: "£199",
    period: "/user/mo",
    description: "Full AI autonomy for agencies that move fast.",
    cta: "Join the waitlist",
    ctaHref: "#waitlist",
    credits: "10,000 AI credits / mo",
    featured: true,
    features: [
      "Autonomous pipeline agents",
      "Zero-loss engagement memory",
      "Voice & meeting summaries",
      "Human-in-the-loop approvals",
      "EU AI Act compliance tools",
    ],
    note: "10,000 AI credits / mo included.",
  },
  {
    tier: "Enterprise",
    label: "Large Firm",
    price: "Custom",
    period: "",
    description: "Dedicated infra, SLAs, and compliance for staffing firms.",
    cta: "Talk to us",
    ctaHref: "#waitlist",
    credits: "Unlimited AI (fair use)",
    features: [
      "Everything in Pro",
      "EU AI Act audit trails",
      "Dedicated infrastructure",
      "Priority SLA",
      "Volume discounts",
    ],
    note: "Enterprise buyers expect custom pricing.",
  },
] as const;

function CheckIcon({ accent }: { accent?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 mt-0.5 shrink-0 ${accent ? "text-cura-accent" : "text-white/30"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingTeaser() {
  return (
    <section id="pricing" className="section-padding bg-cura-black">
      <div className="container-page">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-section-lg font-bold text-white mb-4">Simple, honest pricing.</h2>
          {/* HP-056 */}
          <p className="text-lg text-white/50">No contracts. No seat minimums.</p>
        </div>

        {/* HP-054 — Four-column plan grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={[
                "relative rounded-2xl p-6 flex flex-col gap-5",
                plan.featured
                  ? "bg-cura-accent/10 border border-cura-accent/40 ring-1 ring-cura-accent/20"
                  : "bg-white/[0.03] border border-white/8",
              ].join(" ")}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-cura-accent text-white whitespace-nowrap">
                  Most popular
                </span>
              )}

              {/* Tier name + tagline */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold uppercase tracking-widest ${plan.featured ? "text-cura-accent" : "text-white/30"}`}
                  >
                    {plan.tier}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">{plan.label}</h3>
                <p className="text-sm text-white/40 mt-1 leading-snug">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="border-t border-white/8 pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-white/40">{plan.period}</span>}
                </div>
                {/* AI credits badge */}
                <span
                  className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${plan.featured ? "border-cura-accent/40 text-cura-accent-soft" : "border-white/10 text-white/40"}`}
                >
                  {plan.credits}
                </span>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                    <CheckIcon accent={plan.featured} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* HP-055 — CTA */}
              <div className="flex flex-col gap-2">
                <a
                  href={plan.ctaHref}
                  className={[
                    "block text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-all active:scale-95",
                    plan.featured
                      ? "bg-cura-accent text-white hover:bg-cura-accent/90"
                      : "border border-white/15 text-white/70 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  {plan.cta}
                </a>
                <p className="text-xs text-white/25 text-center">{plan.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI credit explainer */}
        <div className="mt-10 rounded-2xl bg-white/3 border border-white/8 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-cura-accent/15 border border-cura-accent/20 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-cura-accent-soft"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white mb-0.5">
              AI credits — transparent by design
            </p>
            <p className="text-sm text-white/40">
              Every AI action shows its credit cost. Credits roll over monthly. Need more?{" "}
              <span className="text-white/60">Top up at £10 per 1,000 credits.</span>
            </p>
          </div>
          <p className="text-xs text-white/25 shrink-0 sm:text-right">
            Founding members
            <br />
            lock in early-bird rates.
          </p>
        </div>
      </div>
    </section>
  );
}
