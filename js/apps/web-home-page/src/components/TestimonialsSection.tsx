/**
 * TestimonialsSection — HP-044 through HP-047
 *
 * HP-044: Grid of 3 quote cards — horizontal row on desktop, stacked on mobile
 * HP-045: Each card: open-quote glyph, 2-3 sentence quote, avatar + name + firm
 * HP-046: "Trusted by" logo row (real agency logos via logo.dev)
 * HP-047: Star rating micro-element — 5 stars, "4.9 / 5 across beta cohort"
 *
 * Light cream background to contrast the surrounding dark sections.
 */

/** HP-046: real executive search & recruitment firms via logo.dev */
const AGENCIES = [
  { name: "Heidrick & Struggles", domain: "heidrick.com" },
  { name: "Spencer Stuart", domain: "spencerstuart.com" },
  { name: "Korn Ferry", domain: "kornferry.com" },
  { name: "Michael Page", domain: "michaelpage.com" },
  { name: "Egon Zehnder", domain: "egonzehnder.com" },
  { name: "Amrop", domain: "amrop.com" },
];

/** HP-045: testimonial data */
const TESTIMONIALS = [
  {
    id: 1,
    quote:
      "We moved 40% more candidates to second interview in month one. Cura surfaced the context I always lost between meetings — the AI briefing notes are a genuine game-changer.",
    name: "Sarah K.",
    title: "Managing Director",
    firm: "Boutique Search Firm",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    id: 2,
    quote:
      "Before Cura, prep for a client call meant hunting through five different tabs. Now the briefing note is ready before I've opened my laptop. My team reclaimed three hours a day in the first week.",
    name: "James R.",
    title: "Partner",
    firm: "Executive Search Partners",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    id: 3,
    quote:
      "Finally an ATS that doesn't feel like 2008. The keyboard shortcuts made us noticeably faster, and the human-in-the-loop approval flow means I trust every message that goes out.",
    name: "Priya M.",
    title: "Head of Talent",
    firm: "Talent Advisory Group",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="section-padding bg-cura-cream">
      <div className="container-page">
        {/* Section heading */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-cura-accent mb-4">
            Social Proof
          </p>
          <h2 className="font-sans font-semibold text-section-lg text-cura-black leading-tight mx-auto mb-4">
            Trusted by recruiters who
            <br className="hidden sm:block" /> move fast and close deals.
          </h2>
          <p className="text-body-fluid text-cura-muted mx-auto max-w-xl leading-relaxed">
            Early-access teams are already reclaiming hours and placing faster.
          </p>
        </div>

        {/* HP-046: Agency logo row — real logos via logo.dev */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 mb-5">
          {AGENCIES.map(({ name, domain }) => (
            <img
              key={domain}
              src={`https://icon.horse/icon/${domain}`}
              alt={name}
              width={80}
              height={24}
              className="h-6 w-auto object-contain opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-200"
            />
          ))}
        </div>

        {/* HP-047: Star rating micro-element */}
        <div className="flex items-center justify-center gap-3 mb-14">
          <div className="flex gap-0.5" aria-label="Rated 4.9 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className="w-5 h-5 text-cura-accent"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-cura-black/50 font-medium">4.9 / 5 across beta cohort</span>
        </div>

        {/* HP-044 + HP-045: Quote cards — 1 col mobile → 3 col desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-5 rounded-2xl p-7 bg-white border border-cura-border-light"
            >
              {/* Large open-quote glyph in indigo */}
              <div
                className="text-5xl text-cura-accent leading-none select-none font-serif"
                aria-hidden="true"
              >
                &ldquo;
              </div>

              {/* 2–3 sentence quote */}
              <p className="flex-1 text-cura-black/80 text-base leading-relaxed">{t.quote}</p>

              {/* Avatar + name + firm */}
              <div className="flex items-center gap-3 pt-4 border-t border-cura-border-light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.avatar}
                  alt={t.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div>
                  <div className="text-cura-black font-semibold text-sm">{t.name}</div>
                  <div className="text-cura-muted text-xs">
                    {t.title}, {t.firm}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
