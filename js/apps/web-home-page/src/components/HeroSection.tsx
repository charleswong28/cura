/**
 * HeroSection — HP-011 through HP-017
 *
 * Full-viewport opening section. Vertically centred within the space below
 * the fixed NavBar. Two-column layout on desktop:
 *   Left  — text column (headline, subheadline, stat bar, CTAs, social proof)
 *   Right — <HeroVisual> animated pipeline Kanban (stacks below CTAs on mobile)
 */
import HeroVisual from "@/components/HeroVisual";
import WatchDemoButton from "@/components/WatchDemoButton";

const HERO_STATS = [
  { value: "3 hrs", label: "saved / day" },
  { value: "5 tools", label: "replaced" },
  { value: "Zero", label: "lost context" },
  { value: "Human", label: "always in control" },
] as const;

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center section-padding-hero">
      <div className="container-page">
        {/* HP-011: Two-column grid — text left, visual right */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">
          {/* Text column */}
          <div className="max-w-140">
            {/* HP-012: Two-line display headline */}
            <h1 className="font-sans font-semibold leading-[1.1] tracking-tight mb-8 text-hero">
              <span className="block text-cura-white">AI Runs the ATS.</span>
              <span className="block text-gradient-accent">You Close the Deal.</span>
            </h1>

            {/* HP-013: Subheadline */}
            <p className="text-lg xl:text-xl leading-relaxed mb-10 text-cura-white/65">
              Cura handles the heavy lifting admin work so you can focus on the only thing that
              closes deals: <em>human connection.</em>
            </p>

            {/* HP-014: Stat bar — four micro-stats */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 mb-10">
              {HERO_STATS.map(({ value, label }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-cura-accent font-semibold text-base leading-none">
                    {value}
                  </span>
                  <span className="text-xs leading-none text-cura-white/40">{label}</span>
                </div>
              ))}
            </div>

            {/* HP-015 + HP-016: Primary CTA and secondary ghost link */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-cura-accent text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all duration-150"
              >
                Get Early Access{" "}
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
              </a>

              <WatchDemoButton />
            </div>

            {/* HP-017: Social-proof — stacked company logo circles + micro-copy */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  { name: "Reed", domain: "reed.co.uk" },
                  { name: "Adecco", domain: "adecco.com" },
                  { name: "Randstad", domain: "randstad.com" },
                ].map(({ name, domain }) => (
                  <div
                    key={domain}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-[0_0_0_2px_var(--color-cura-base)]"
                    title={name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://icon.horse/icon/${domain}`}
                      alt={name}
                      width={28}
                      height={28}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs tracking-wide text-cura-white/40">
                Trusted by 40+ recruitment agencies in beta
              </p>
            </div>
          </div>

          {/* HP-011: Visual panel */}
          <div className="flex items-center justify-center lg:justify-end mt-4 lg:mt-0">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
