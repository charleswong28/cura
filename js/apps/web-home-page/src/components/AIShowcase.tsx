/**
 * AIShowcase — HP-032 through HP-037
 * "Intelligence that compounds." — tabbed demo panel + keyboard callout.
 *
 * HP-032: Dark section, centred headline + eyebrow
 * HP-033: Three-tab showcase — 📋 Match · ✉️ Draft · 📅 Brief
 * HP-034: Draft tab typewriter (~40 chars/sec), fires once on first viewport entry
 * HP-035: "AI does the thinking. You make the call." italic caption
 * HP-036: KeyboardBadge — ⌘K · G C · A shortcuts in key-cap style
 * HP-037: Badge embedded in "Built for speed" callout box
 */
"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "match" | "draft" | "brief";

// ─── Match Panel (HP-033 Match tab) ──────────────────────────────────────────

const SKILL_CHIPS = [
  "SaaS Finance",
  "Series B–D",
  "Revenue Ops",
  "IFRS Reporting",
  "M&A Integration",
  "CFO Track Record",
] as const;

const WHY_MATCH = [
  "3× revenue growth directly matches mandate brief",
  "London-based — no relocation required",
  "Prior client relationship in same sector",
] as const;

function MatchPanel() {
  return (
    <div className="dark-panel">
      {/* Candidate header + score circle */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-mock-3xl font-semibold text-cura-white/90">
            Sarah Chen
          </div>
          <div className="text-mock-base text-cura-white/40 mt-0.5">
            CFO · Meridian Capital · London
          </div>
        </div>
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-cura-accent/70 bg-cura-accent/10 shrink-0">
          <div className="text-mock-2xl font-bold text-cura-accent-soft leading-none">
            87%
          </div>
          <div className="text-mock-2xs text-cura-accent-soft/60 uppercase tracking-widest mt-0.5">
            fit
          </div>
        </div>
      </div>

      {/* Skill chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SKILL_CHIPS.map((s) => (
          <span
            key={s}
            className="px-2.5 py-0.5 rounded-full bg-cura-accent/12 border border-cura-accent/22 text-cura-accent-soft text-mock-sm font-medium"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Why this match explainer */}
      <div className="bg-black/30 border border-white/10 rounded-lg p-3">
        <div className="text-mock-xs text-cura-white/30 uppercase tracking-[0.12em] mb-2">
          Why this match
        </div>
        <div className="flex flex-col gap-1.5">
          {WHY_MATCH.map((text) => (
            <div
              key={text}
              className="flex items-start gap-2 text-mock-base text-cura-white/65"
            >
              <span className="text-cura-accent font-bold leading-[1.65] shrink-0">
                ✓
              </span>
              <span className="leading-[1.65]">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI provenance */}
      <div className="mt-3 flex items-center gap-1.5 text-mock-xs text-cura-white/30">
        <span className="text-cura-accent-soft">⚡</span>
        Scored against mandate brief
      </div>
    </div>
  );
}

// ─── Draft Panel (HP-033 Draft tab + HP-034 typewriter) ──────────────────────

const DRAFT_SUBJECT = "Sarah Chen — CFO Opportunity at Northstar Capital";
const DRAFT_BODY = `Hi Marcus,

I'd like to put forward Sarah Chen for your CFO role. Her 3× revenue growth at Meridian Capital directly matches your mandate brief, and she's London-based with no relocation needed.

Briefing note attached. Free Thursday afternoon for an intro call?

Best,
Alex`;

interface DraftPanelProps {
  /** Text displayed so far (typewriter progress lives in parent state). */
  displayed: string;
  /** True once all characters have been typed — hides the cursor. */
  complete: boolean;
}

function DraftPanel({ displayed, complete }: DraftPanelProps) {
  return (
    <div className="dark-panel">
      {/* macOS-style window chrome */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        <span className="ml-2 text-mock-xs text-cura-white/25">New Message</span>
      </div>

      {/* Email headers */}
      <div className="border-b border-white/8 pb-2.5 mb-3 space-y-1.5">
        <div className="flex items-center gap-2 text-mock-sm">
          <span className="text-cura-white/30 w-7 shrink-0">To</span>
          <span className="text-cura-white/55">
            Marcus Webb &lt;m.webb@northstar.com&gt;
          </span>
        </div>
        <div className="flex items-center gap-2 text-mock-sm">
          <span className="text-cura-white/30 w-7 flex-shrink-0">Re</span>
          <span className="text-cura-white/55">{DRAFT_SUBJECT}</span>
        </div>
      </div>

      {/* Typewriter body */}
      <div className="text-mock-base text-cura-white/65 leading-[1.75] whitespace-pre-wrap min-h-[5rem]">
        {displayed}
        {!complete && (
          <span
            className="inline-block w-[2px] h-[0.85em] bg-cura-accent ml-0.5 align-middle rounded-sm"
            style={{ animation: "blink-cursor 1s step-end infinite" }}
          />
        )}
      </div>

      {/* AI provenance */}
      <div className="mt-3 flex items-center gap-1.5 text-mock-xs text-cura-white/30">
        <span className="text-cura-accent-soft">⚡</span>
        AI-drafted from meeting notes + email history · awaiting your approval
      </div>
    </div>
  );
}

// ─── Brief Panel (HP-033 Brief tab) ──────────────────────────────────────────

const FOLLOW_UPS = [
  { done: true,  text: "Send Northstar Capital investment thesis" },
  { done: false, text: "Confirm exclusive window extended to Friday" },
  { done: false, text: "Send Sarah prep notes before Thursday" },
] as const;

function BriefPanel() {
  return (
    <div className="dark-panel">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-mock-3xl font-semibold text-cura-white/90">
            Meeting Brief
            <span className="text-cura-white/35 font-normal"> — Northstar CFO Search</span>
          </div>
          <div className="text-mock-base text-cura-white/40 mt-0.5">
            Sarah Chen · Zoom · in 10 mins
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-cura-accent/12 border border-cura-accent/22 text-cura-accent-soft text-mock-xs font-semibold flex-shrink-0">
          AI Generated
        </span>
      </div>

      {/* What was discussed */}
      <div className="border-b border-white/[0.06] pb-3 mb-3">
        <div className="text-mock-xs text-cura-accent-soft/70 uppercase tracking-[0.12em] mb-1.5">
          What we discussed
        </div>
        <div className="text-mock-base text-cura-white/65 leading-[1.65]">
          Sarah confirmed strong interest in the Northstar CFO role. She's been
          considering a move for ~6 months but hasn't told her current board yet
          — handle with discretion. Wants to understand equity structure before
          going further.
        </div>
      </div>

      {/* Personal touches */}
      <div className="border-b border-white/[0.06] pb-3 mb-3">
        <div className="text-mock-xs text-cura-accent-soft/70 uppercase tracking-[0.12em] mb-1.5">
          Personal context
        </div>
        <div className="flex flex-col gap-1">
          {[
            "Daughter just started at Cambridge — she's ready for \"a new chapter\"",
            "Prefers email over calls; typically replies within 2 hrs",
            "Climbs on weekends — mentioned Fontainebleau trip next month",
          ].map((note) => (
            <div key={note} className="flex items-start gap-1.5 text-mock-base text-cura-white/55">
              <span className="text-cura-accent-soft/50 flex-shrink-0 mt-[0.1rem]">·</span>
              <span className="leading-[1.6]">{note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up actions */}
      <div>
        <div className="text-mock-xs text-cura-accent-soft/70 uppercase tracking-[0.12em] mb-1.5">
          Follow-up actions
        </div>
        <div className="flex flex-col gap-1.5">
          {FOLLOW_UPS.map(({ done, text }) => (
            <div key={text} className="flex items-center gap-2 text-mock-base">
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 text-[0.5rem] font-bold border ${
                  done
                    ? "bg-cura-accent/30 border-cura-accent/50 text-cura-accent-soft"
                    : "border-white/20 text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={done ? "line-through text-cura-white/30" : "text-cura-white/65"}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI provenance */}
      <div className="mt-3 flex items-center gap-1.5 text-mock-xs text-cura-white/30">
        <span className="text-cura-accent-soft">⚡</span>
        Auto-generated from Zoom transcript + email thread · 8 min ago
      </div>
    </div>
  );
}

// ─── Keyboard Badge (HP-036) ──────────────────────────────────────────────────

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.6rem] px-2 py-1 rounded-md bg-white/[0.08] border border-white/[0.16] border-b-[3px] text-cura-white/75 text-mock-sm font-mono font-semibold select-none">
      {children}
    </kbd>
  );
}

// Each shortcut has one or more key combos (groups). Multiple groups are
// rendered side-by-side separated by "/" — used to show ⌘1 / ⌘2 / ⌘3.
const SHORTCUTS: { groups: string[][]; label: string }[] = [
  { groups: [["⌘", "K"]],                        label: "Command palette"     },
  { groups: [["⌘", "1 / 2 / 3"]],                      label: "Switch tabs"           },
  { groups: [["↵"]],                              label: "Approve draft"       },
];

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-1">
          <Key>{k}</Key>
          {i < keys.length - 1 && (
            <span className="text-cura-white/20 text-mock-xs">+</span>
          )}
        </span>
      ))}
    </span>
  );
}

function KeyboardBadge() {
  return (
    <div className="dark-panel w-full max-w-70">
      <div className="flex items-center gap-2 mb-3.5">
        <span className="text-cura-accent text-base">⌨</span>
        <span className="text-mock-xl font-semibold text-cura-white/75">
          Keyboard shortcuts
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {SHORTCUTS.map(({ groups, label }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              {groups.map((keys, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <KeyCombo keys={keys} />
                  {i < groups.length - 1 && (
                    <span className="text-cura-white/20 text-mock-xs">/</span>
                  )}
                </span>
              ))}
            </div>
            <span className="text-mock-base text-cura-white/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "match", label: "📋 Match" },
  { id: "draft", label: "✉️ Draft" },
  { id: "brief", label: "📅 Brief" },
];

export default function AIShowcase() {
  const [activeTab, setActiveTab] = useState<Tab>("match");
  const sectionRef = useRef<HTMLElement>(null);
  const [inViewport, setInViewport] = useState(false);

  // Draft typewriter state — kept in parent so it persists across tab switches
  const [draftText, setDraftText] = useState("");
  const [draftComplete, setDraftComplete] = useState(false);
  const draftStarted = useRef(false);

  // Detect when section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInViewport(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Start typewriter exactly once: when Draft tab is active and section is in view
  useEffect(() => {
    if (activeTab !== "draft" || !inViewport || draftStarted.current) return;
    draftStarted.current = true;

    let i = 0;
    const tick = () => {
      i++;
      setDraftText(DRAFT_BODY.slice(0, i));
      if (i < DRAFT_BODY.length) {
        setTimeout(tick, 25); // 25 ms ≈ 40 chars/sec
      } else {
        setDraftComplete(true);
      }
    };
    setTimeout(tick, 400); // short delay before typing begins
  }, [activeTab, inViewport]);

  return (
    <section ref={sectionRef} className="section-padding bg-cura-black">
      <div className="container-page">

        {/* HP-032 — eyebrow + headline + subline */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cura-accent/10 border border-cura-accent/20 text-cura-accent-soft text-xs font-semibold uppercase tracking-widest mb-6">
            <span>🤖</span>
            <span>AI Intelligence</span>
          </div>
          <h2 className="font-sans text-section-lg font-bold text-cura-white leading-[1.1] mb-5">
            Intelligence that compounds.
          </h2>
          <p className="text-body-fluid text-cura-white/50 max-w-xl mx-auto leading-[1.8]">
            Every interaction makes Cura smarter. Match scores tighten. Drafts
            improve. Briefings sharpen.
          </p>
        </div>

        {/* HP-033 — tabbed showcase */}
        <div className="max-w-2xl mx-auto">
          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 mb-6">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  activeTab === id
                    ? "bg-cura-accent text-white"
                    : "text-cura-white/50 hover:text-cura-white/75 bg-transparent",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Panel — key triggers fade-in animation on each tab switch */}
          <div key={activeTab} style={{ animation: "fade-in-up 0.25s ease both" }}>
            {activeTab === "match" && <MatchPanel />}
            {activeTab === "draft" && (
              <DraftPanel displayed={draftText} complete={draftComplete} />
            )}
            {activeTab === "brief" && <BriefPanel />}
          </div>
        </div>

        {/* HP-035 — caption */}
        <p className="text-center text-cura-white/35 italic text-body-fluid mt-8 mb-14">
          AI does the thinking. You make the call.
        </p>

        {/* HP-036 + HP-037 — KeyboardBadge inside speed callout box */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 px-8 py-8 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-center sm:text-left flex-1 max-w-sm">
            <div className="text-cura-white/85 font-semibold text-body-fluid mb-2">
              Built for speed. Every action has a shortcut.
            </div>
            <div className="text-cura-white/40 text-sm leading-[1.7]">
              Every action has a keyboard shortcut. Navigate the entire platform without lifting your hands from the keys.
            </div>
          </div>
          <KeyboardBadge />
        </div>

      </div>
    </section>
  );
}
