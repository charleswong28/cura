/**
 * ValuePropsSection — HP-025 through HP-031
 * Three-pillar feature showcase: Autonomous Pipeline · Zero-Loss Memory · Human-in-the-Loop
 * SpeedBanner (animated counter) sits between pillar 1 and 2.
 */
'use client';

import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────
// Shared: Icon badge chip used at top of every visual panel (HP-029)
// ─────────────────────────────────────────────────────────

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '999px',
        padding: '0.25rem 0.75rem',
        fontSize: '0.7rem',
        color: '#818CF8',
        marginBottom: '1.25rem',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Visual Panel 1: Animated Pipeline (HP-026)
// ─────────────────────────────────────────────────────────

function CandidateCard({
  name,
  role,
  glow = false,
  badge,
}: {
  name: string;
  role: string;
  glow?: boolean;
  badge?: string;
}) {
  return (
    <div
      style={{
        background: glow ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${glow ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '0.4rem',
        padding: '0.6rem 0.7rem',
        marginBottom: '0.4rem',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(245,245,243,0.85)' }}>{name}</div>
      <div style={{ fontSize: '0.6rem', color: 'rgba(245,245,243,0.4)' }}>{role}</div>
      {badge && (
        <div
          style={{
            marginTop: '0.3rem',
            fontSize: '0.55rem',
            color: '#818CF8',
            fontWeight: 600,
          }}
        >
          ✦ {badge}
        </div>
      )}
    </div>
  );
}

function PipelineVisual() {
  const [phase, setPhase] = useState<'idle' | 'moving' | 'done'>('idle');

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      setPhase('idle');
      timeouts.push(setTimeout(() => setPhase('moving'), 1800));
      timeouts.push(setTimeout(() => setPhase('done'), 3000));
    };

    run();
    const interval = setInterval(run, 7500);
    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const colLabel = (text: string) => (
    <div
      style={{
        fontSize: '0.62rem',
        color: 'rgba(245,245,243,0.35)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: '0.5rem',
        fontWeight: 600,
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        background: '#16131f',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '1rem',
        padding: '1.5rem',
      }}
    >
      <IconBadge>⚡ Autonomous Pipeline</IconBadge>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Sourced — hidden on mobile */}
        <div className="hidden lg:block">
          {colLabel('Sourced')}
          <CandidateCard name="Priya M." role="CFO Search" />
          <CandidateCard name="Tom B." role="VP Ops" />
        </div>

        {/* Screened — Sam moves out on 'done' */}
        <div>
          {colLabel('Screened')}
          {phase !== 'done' && (
            <CandidateCard
              name="Sam T."
              role="Exec Search"
              glow={phase === 'moving'}
              badge={phase === 'moving' ? 'AI processing…' : undefined}
            />
          )}
          <CandidateCard name="Jordan L." role="Fin Dir." />
        </div>

        {/* Interviewing — Sam arrives on 'done' */}
        <div>
          {colLabel('Interview')}
          <CandidateCard name="Maria C." role="CTO Search" />
          {phase === 'done' && (
            <CandidateCard name="Sam T." role="Exec Search" badge="AI moved · just now" />
          )}
        </div>

        {/* Offer — hidden on mobile */}
        <div className="hidden lg:block">
          {colLabel('Offer')}
          <CandidateCard name="Ravi P." role="VP Eng" />
        </div>
      </div>

      {/* Tooltip — appears when card moves (HP-026 visual) */}
      <div
        style={{
          marginTop: '0.9rem',
          padding: '0.6rem 0.85rem',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.22)',
          borderRadius: '0.5rem',
          fontSize: '0.72rem',
          color: 'rgba(245,245,243,0.75)',
          opacity: phase === 'done' ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        💡 Your Cura AI meeting notes are ready.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Visual Panel 2: Timeline Feed (HP-027)
// ─────────────────────────────────────────────────────────

const TIMELINE_ENTRIES = [
  { icon: '💼', label: 'LinkedIn', detail: 'Alex replied to your InMail', time: '9:14 am' },
  { icon: '🎥', label: 'Zoom', detail: 'Transcript analysed — 3 key signals flagged', time: '10:30 am' },
  { icon: '📧', label: 'Email', detail: 'Follow-up opened ×2 — no reply yet', time: '11:48 am' },
  { icon: '📅', label: 'Calendar', detail: 'Interview confirmed — Fri 14:00', time: '2:03 pm' },
];

function TimelineVisual() {
  return (
    <div
      style={{
        background: '#16131f',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '1rem',
        padding: '1.5rem',
      }}
    >
      <IconBadge>🧠 Zero-Loss Memory</IconBadge>

      <div
        style={{
          fontSize: '0.75rem',
          color: 'rgba(245,245,243,0.45)',
          marginBottom: '0.75rem',
          fontWeight: 500,
        }}
      >
        Alex Novak · CFO Search · Today
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {TIMELINE_ENTRIES.map((entry, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '0.7rem',
              alignItems: 'flex-start',
              padding: '0.6rem 0.75rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.4 }}>{entry.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(245,245,243,0.75)' }}>
                  {entry.label}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(245,245,243,0.3)', flexShrink: 0 }}>
                  {entry.time}
                </span>
              </div>
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'rgba(245,245,243,0.5)',
                  marginTop: '0.15rem',
                  lineHeight: 1.4,
                }}
              >
                {entry.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Visual Panel 3: Approval Modal (HP-028)
// ─────────────────────────────────────────────────────────

function ApprovalVisual() {
  const [approved, setApproved] = useState(false);

  return (
    <div
      style={{
        background: '#16131f',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '1rem',
        padding: '1.5rem',
      }}
    >
      <IconBadge>🛡️ Human-in-the-Loop</IconBadge>

      {!approved ? (
        <>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'rgba(245,245,243,0.9)',
              marginBottom: '0.2rem',
            }}
          >
            Submission draft ready
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(245,245,243,0.4)', marginBottom: '1rem' }}>
            Priya M. → Northstar Capital · CFO role
          </div>

          {/* Email preview */}
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              padding: '0.9rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontSize: '0.62rem', color: 'rgba(245,245,243,0.3)', marginBottom: '0.5rem' }}>
              To: Marcus Webb &lt;m.webb@northstar.com&gt;
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(245,245,243,0.6)', lineHeight: 1.65 }}>
              Hi Marcus, I&apos;d like to put forward Priya Mehta for the CFO role. Her track record in
              SaaS finance leadership is exceptional — 3× revenue growth at her last firm...
            </div>
            <div
              style={{
                marginTop: '0.5rem',
                height: '0.9rem',
                background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.25))',
                borderRadius: '0.25rem',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={{
                flex: 1,
                padding: '0.6rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.4rem',
                fontSize: '0.75rem',
                color: 'rgba(245,245,243,0.55)',
                cursor: 'pointer',
              }}
            >
              Edit Draft
            </button>
            <button
              onClick={() => setApproved(true)}
              style={{
                flex: 2,
                padding: '0.6rem 1rem',
                background: '#6366F1',
                border: 'none',
                borderRadius: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Approve &amp; Send →
            </button>
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              fontSize: '0.62rem',
              color: 'rgba(245,245,243,0.28)',
              textAlign: 'center',
            }}
          >
            You have final approval on every send. No autonomous actions.
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            animation: 'fade-in-up 0.4s ease both',
          }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#6366F1' }}>✓</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(245,245,243,0.9)' }}>
            Sent to Marcus Webb
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(245,245,243,0.4)', marginTop: '0.25rem' }}>
            Priya M. submission · just now
          </div>
          <button
            onClick={() => setApproved(false)}
            style={{
              marginTop: '1.5rem',
              fontSize: '0.65rem',
              color: '#818CF8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Reset demo
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SpeedBanner — HP-030 + HP-031 (animated counter)
// ─────────────────────────────────────────────────────────

function SpeedBanner() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          setTriggered(true);
          let current = 0;
          const target = 3;
          const steps = 30;
          const stepSize = target / steps;
          const id = setInterval(() => {
            current += stepSize;
            if (current >= target) {
              setCount(target);
              clearInterval(id);
            } else {
              setCount(parseFloat(current.toFixed(1)));
            }
          }, 50);
        }
      },
      { threshold: 0.4 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [triggered]);

  return (
    <div
      ref={ref}
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #2e1065 100%)',
        padding: '5rem 0',
      }}
    >
      <div className="container-page" style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 'clamp(4rem, 9vw, 7rem)',
            fontWeight: 700,
            color: '#F5F5F3',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {count}{' '}
          <span
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: 'rgba(245,245,243,0.65)' }}
          >
            hrs
          </span>
        </div>
        <p
          style={{
            fontSize: 'clamp(1.05rem, 1.8vw, 1.3rem)',
            color: 'rgba(245,245,243,0.75)',
            marginTop: '1.25rem',
            maxWidth: '520px',
            margin: '1.25rem auto 0',
            lineHeight: 1.6,
          }}
        >
          Recruiters using Cura reclaim an average of{' '}
          <strong style={{ color: '#F5F5F3' }}>3 hours per day.</strong>
        </p>
        <p
          style={{
            fontSize: '0.72rem',
            color: 'rgba(245,245,243,0.3)',
            marginTop: '1.5rem',
          }}
        >
          * Based on time-tracking data across beta cohort, Q4 2025.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Pillar data + visual routing
// ─────────────────────────────────────────────────────────

const PILLARS = [
  {
    id: 'pipeline',
    label: 'Autonomous Pipeline',
    headline: 'AI that moves the deal.',
    subtext:
      "Cura reads your meeting notes and emails. When a candidate is interviewed, their stage advances and a briefing note is ready — before you've had coffee.",
    reverse: false,
  },
  {
    id: 'memory',
    label: 'Zero-Loss Memory',
    headline: 'Every signal. One timeline.',
    subtext:
      'LinkedIn replies, Zoom transcripts, email opens — everything is synthesized into a single, permanent record. Enter every conversation knowing exactly where things stand.',
    reverse: true,
  },
  {
    id: 'hitl',
    label: 'Human-in-the-Loop',
    headline: 'AI drafts. You decide.',
    subtext:
      'No autonomous sending. No hallucination risk. For every high-stakes action — client submission, offer, key message — Cura presents a draft and waits for your approval.',
    reverse: false,
  },
] as const;

function PillarVisual({ id }: { id: (typeof PILLARS)[number]['id'] }) {
  if (id === 'pipeline') return <PipelineVisual />;
  if (id === 'memory') return <TimelineVisual />;
  if (id === 'hitl') return <ApprovalVisual />;
}

// ─────────────────────────────────────────────────────────
// Main export — ValuePropsSection (HP-025)
// ─────────────────────────────────────────────────────────

export default function ValuePropsSection() {
  return (
    <section id="product">
      <SpeedBanner />
      {PILLARS.map((pillar, i) => (
        <div key={pillar.id}>
          {/* Full-viewport pillar row (HP-025) — light background matching Superhuman rhythm */}
          <div
            className="section-padding"
            style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', background: '#FAFAF8' }}
          >
            <div className="container-page" style={{ width: '100%' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">
                {/* Text block — HP-029: indigo left-border accent line */}
                <div className={pillar.reverse ? 'lg:order-2' : 'lg:order-1'}>
                  <div
                    style={{
                      borderLeft: '3px solid #6366F1',
                      paddingLeft: '1.5rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#6366F1',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                      }}
                    >
                      {pillar.label}
                    </div>
                    <h2
                      style={{
                        fontSize: 'clamp(2rem, 2rem, 2.5rem)',
                        fontWeight: 700,
                        color: '#0F0E1A',
                        lineHeight: 1.1,
                        marginBottom: '1.25rem',
                      }}
                    >
                      {pillar.headline}
                    </h2>
                    <p
                      style={{
                        fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
                        color: '#6B7280',
                        lineHeight: 1.7,
                        maxWidth: '480px',
                      }}
                    >
                      {pillar.subtext}
                    </p>
                  </div>
                </div>

                {/* Visual block — HP-029: icon badge top-left of visual panel */}
                <div className={pillar.reverse ? 'lg:order-1' : 'lg:order-2'}>
                  <PillarVisual id={pillar.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
