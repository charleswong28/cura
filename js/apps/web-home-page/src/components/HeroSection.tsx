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

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col justify-center section-padding"
      style={{ paddingTop: "calc(4rem + var(--section-padding-y-mobile))" }}
    >
      <div className="container-page">
        {/* HP-011: Two-column grid — text left, visual right */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">
        {/* Text column */}
        <div className="max-w-[560px]">
          {/* HP-012: Two-line display headline, serif, ~96 px */}
          <h1
            className="font-sans font-semibold leading-[1.1] tracking-tight mb-8"
            style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)" }}
          >
            <span className="block text-cura-white">Stop Clicking.</span>
            <span
              className="block"
              style={{
                background:
                  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Start Connecting.
            </span>
          </h1>

          {/* HP-013: Subheadline */}
          <p
            className="text-lg xl:text-xl leading-relaxed mb-10"
            style={{ color: "rgba(245,245,243,0.65)" }}
          >
            Cura handles the heavy lifting admin work so you can
            focus on the only thing that closes deals:{" "}
            <em>human connection.</em>
          </p>

          {/* HP-014: Stat bar — four micro-stats */}
          <div className="flex flex-wrap gap-x-8 gap-y-4 mb-10">
            {(
              [
                { value: "3 hrs", label: "saved / day" },
                { value: "5 tools", label: "replaced" },
                { value: "Zero", label: "lost context" },
                { value: "Human", label: "always in control" },
              ] as const
            ).map(({ value, label }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-cura-accent font-semibold text-base leading-none">
                  {value}
                </span>
                <span
                  className="text-xs leading-none"
                  style={{ color: "rgba(245,245,243,0.40)" }}
                >
                  {label}
                </span>
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

          {/* HP-017: Social-proof micro-copy with avatar circles */}
          <div className="flex items-center gap-3">
            {/* Three overlapping placeholder avatars */}
            <div className="flex -space-x-2">
              {[
                { initials: "SK", bg: "#4F46E5" },
                { initials: "MR", bg: "#7C3AED" },
                { initials: "JP", bg: "#6366F1" },
              ].map(({ initials, bg }) => (
                <div
                  key={initials}
                  aria-hidden="true"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ring-2"
                  style={{ background: bg, ringColor: "#0A0A0A" as never, boxShadow: "0 0 0 2px #0A0A0A" }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <p
              className="text-xs tracking-wide"
              style={{ color: "rgba(245,245,243,0.40)" }}
            >
              Trusted by 40+ recruitment agencies in beta
            </p>
          </div>
        </div>

        {/* HP-011: Visual panel — stacks below CTAs on mobile, side-by-side on desktop */}
        <div className="flex items-center justify-center lg:justify-end mt-4 lg:mt-0">
          <HeroVisual />
        </div>
        </div>
      </div>
    </section>
  );
}
