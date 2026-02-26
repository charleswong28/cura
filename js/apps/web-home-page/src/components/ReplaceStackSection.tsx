/**
 * ReplaceStackSection — HP-060 through HP-063
 * "One brain. Not five tools." — stack consolidation visual + NLP search demo.
 *
 * HP-060: Headline + subline (centred, font-display)
 * HP-061: Old stack (5 greyed pills with ×) → sweep arrow → Cura card with indigo glow
 * HP-062: Cost implication italic subtext beneath the visual
 * HP-063: Terminal-style NLP search callout with typewriter + blinking cursor
 */
"use client";

import { useEffect, useRef, useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const OLD_TOOLS = [
  { label: "ATS", icon: "📁" },
  { label: "LinkedIn Recruiter", icon: "🔗" },
  { label: "Email Sequencer", icon: "✉️" },
  { label: "Enrichment API", icon: "🔬" },
  { label: "Calendar Sync", icon: "📅" },
] as const;

const NLP_QUERY =
  "Show me CFO candidates in London who interviewed in the last 90 days";

// ─── Old stack (HP-061 left side) ────────────────────────────────────────────

function OldStack() {
  return (
    <div className="flex flex-col gap-2.5 w-full max-w-60 mx-auto lg:mx-0">
      {OLD_TOOLS.map(({ label, icon }) => (
        <div
          key={label}
          className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white/4 border border-white/[0.07]"
        >
          {/* Strikethrough line */}
          <div className="absolute inset-x-3 top-1/2 h-px bg-red-400/35 -translate-y-1/2 pointer-events-none" />
          <span className="text-base opacity-20">{icon}</span>
          <span className="text-sm font-medium text-cura-white/25">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Animated sweep arrow (HP-061 centre) ────────────────────────────────────

function SweepArrow() {
  return (
    <div className="flex flex-col items-center gap-2.5 py-6 lg:py-0 shrink-0">
      {/* Line with moving shimmer + CSS arrowhead */}
      <div className="flex items-center">
        <div className="relative w-16 h-0.5 bg-cura-accent/20 overflow-hidden rounded-full">
          <div
            className="absolute inset-y-0 w-8 bg-linear-to-r from-transparent via-cura-accent to-transparent"
            style={{ animation: "arrow-sweep 1.6s ease-in-out infinite" }}
          />
        </div>
        {/* Arrowhead — inline style avoids needing a Tailwind arbitrary border-color */}
        <div
          className="shrink-0"
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid #6366F1",
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
          }}
        />
      </div>
      <div className="text-[0.58rem] text-cura-accent/40 uppercase tracking-[0.15em] font-semibold">
        replaces
      </div>
    </div>
  );
}

// ─── Cura card (HP-061 right side) ───────────────────────────────────────────

function CuraCard() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-8 py-8 rounded-2xl border border-cura-accent/25 bg-cura-accent/[0.06] w-full max-w-[240px] mx-auto lg:mx-0"
      style={{
        boxShadow:
          "0 0 48px 0 rgba(99, 102, 241, 0.20), 0 0 100px 0 rgba(139, 92, 246, 0.08)",
      }}
    >
      <div className="text-center">
        <div className="text-cura-white font-semibold text-base tracking-tight">
          Cura
        </div>
        <div className="text-cura-accent-soft text-sm mt-0.5">One platform</div>
      </div>

      {/* Feature capability chips */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {["AI Layer", "Pipeline", "Memory", "NL Search"].map((f) => (
          <span
            key={f}
            className="px-2.5 py-0.5 rounded-full bg-cura-accent/12 border border-cura-accent/22 text-cura-accent-soft text-xs font-medium"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── NLP search web UI (HP-063) ──────────────────────────────────────────────

const MOCK_RESULTS = [
  { name: "Sarah Chen", title: "CFO", company: "Meridian Capital", location: "London", interviewed: "3 days ago", score: 94 },
  { name: "James Okafor", title: "CFO", company: "Finsbury Growth", location: "London", interviewed: "11 days ago", score: 88 },
  { name: "Priya Mehta", title: "CFO", company: "Apex Ventures", location: "London", interviewed: "28 days ago", score: 81 },
] as const;

function NLPSearch() {
  const [displayed, setDisplayed] = useState("");
  const [showResults, setShowResults] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  // Typewriter fires once on scroll-into-view; results fade in after typing completes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          let i = 0;
          const tick = () => {
            i++;
            setDisplayed(NLP_QUERY.slice(0, i));
            if (i < NLP_QUERY.length) setTimeout(tick, 28);
            else setTimeout(() => setShowResults(true), 300);
          };
          setTimeout(tick, 500);
        }
      },
      { threshold: 0.4 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mx-auto max-w-2xl">
      {/* Search input */}
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/12 bg-cura-surface">
        {/* Search icon */}
        <svg className="w-4 h-4 text-cura-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>

        {/* Typewriter query */}
        <div className="flex-1 text-sm text-cura-white/80 min-h-5">
          {displayed}
          <span
            className="inline-block w-0.5 h-[0.85em] bg-cura-accent ml-0.5 align-middle rounded-sm"
            style={{ animation: showResults ? "none" : "blink-cursor 1s step-end infinite", opacity: showResults ? 0 : 1 }}
          />
        </div>

        {/* Enter / search hint */}
        <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/6 border border-white/10 text-cura-white/30 text-xs font-sans">
          ↵
        </kbd>
      </div>

      {/* Results — only mounted once typing finishes, animates in */}
      {showResults && (
        <div
          className="mt-2 rounded-xl border border-white/9 bg-cura-surface overflow-hidden"
          style={{ animation: "fade-in-up 0.4s ease both" }}
        >
          {/* Results header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
            <span className="text-xs text-cura-white/35 font-medium">3 candidates found</span>
            <span className="text-xs text-cura-accent/60">Sorted by fit score</span>
          </div>

          {/* Candidate rows */}
          {MOCK_RESULTS.map((r) => (
            <div key={r.name} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-cura-accent/20 flex items-center justify-center text-cura-accent-soft text-xs font-semibold shrink-0">
                {r.name.split(" ").map((n) => n[0]).join("")}
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-cura-white/85 leading-tight">{r.name}</div>
                <div className="text-xs text-cura-white/40 mt-0.5">{r.title} · {r.company} · {r.location}</div>
              </div>

              {/* Interviewed */}
              <div className="hidden sm:block text-xs text-cura-white/30 shrink-0">
                Interviewed {r.interviewed}
              </div>

              {/* Fit score */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-16 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cura-accent"
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-cura-accent-soft">{r.score}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-cura-white/25">
        Natural language search — included as standard, not a paid add-on.
      </p>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export default function ReplaceStackSection() {
  return (
    <section className="section-padding bg-cura-base">
      <div className="container-page">

        {/* HP-060 — headline + subline */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cura-accent/10 border border-cura-accent/20 text-cura-accent-soft text-xs font-semibold uppercase tracking-widest mb-6">
            <span>🗂</span>
            <span>Stack Replacement</span>
          </div>
          <h2 className="font-sans text-section-lg font-bold text-cura-white leading-[1.1] mb-5">
            One brain. Not five tools.
          </h2>
          <p className="text-body-fluid text-cura-white/50 max-w-xl mx-auto leading-[1.8]">
            Fragmented tools mean fragmented AI. Cura connects every email, call, and
            LinkedIn signal into one system so your AI has full context, and
            your firm becomes truly AI-native.
          </p>
        </div>

        {/* HP-061 — Cura → sweep arrow → old stack (reads: "Cura replaces these tools") */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-10 mb-10">
          <CuraCard />
          <SweepArrow />
          <OldStack />
        </div>

        {/* HP-062 — cost implication subtext */}
        <p className="text-center text-cura-white/35 italic text-body-fluid mb-12">
          No manual syncs. No context gaps between tools. This is what being truly AI-native looks like.
        </p>

        {/* HP-063 — NLP search web UI */}
        <NLPSearch />

      </div>
    </section>
  );
}
