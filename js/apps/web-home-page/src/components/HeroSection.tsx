/**
 * HeroSection — HP-011 through HP-017
 *
 * Full-viewport opening section. Vertically centred within the space below
 * the fixed NavBar. Left-aligned text column with headline, subheadline,
 * stat bar, CTA buttons, and social proof micro-copy.
 *
 * Right-side visual panel (HP-018–020) will be added in a follow-up task.
 */
export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col justify-center section-padding"
      style={{ paddingTop: "calc(4rem + var(--section-padding-y-mobile))" }}
    >
      <div className="container-page">
        {/* Text column — max-width keeps copy tight and scannable */}
        <div className="max-w-[600px]">
          {/* HP-012: Two-line display headline, serif, ~96 px */}
          <h1
            className="font-display leading-[0.92] tracking-tight mb-8"
            style={{ fontSize: "clamp(3.5rem, 7vw, 6rem)" }}
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
            className="text-lg xl:text-xl leading-relaxed mb-10 max-w-[520px]"
            style={{ color: "rgba(245,245,243,0.65)" }}
          >
            The AI-first recruitment platform that moves the deal — from{" "}
            <em>first signal to signed offer</em> — so you can focus on the
            relationships only you can build.
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

            <a
              href="#demo"
              className="text-sm font-medium hover:text-cura-white transition-colors duration-200"
              style={{ color: "rgba(245,245,243,0.50)" }}
            >
              Watch 90-second demo{" "}
              <span aria-hidden="true">▶</span>
            </a>
          </div>

          {/* HP-017: Social-proof micro-copy */}
          <p
            className="text-xs tracking-wide"
            style={{ color: "rgba(245,245,243,0.30)" }}
          >
            Trusted by 40+ recruitment agencies in beta
          </p>
        </div>
      </div>
    </section>
  );
}
