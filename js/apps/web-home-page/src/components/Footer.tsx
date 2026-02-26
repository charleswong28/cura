"use client";

/**
 * Footer — HP-057 through HP-059
 *
 * HP-057: Dark #0A0A0A, three-column layout — brand · links · social icons
 * HP-058: Copyright "© 2026 Cura. Built for the humans who build careers."
 * HP-059: GDPR cookie-consent banner — dark-styled, bottom-bar, localStorage
 */

import { useState, useEffect } from "react";

const CONSENT_KEY = "cura-cookie-consent";

const LINKS = {
  Product: [
    { label: "Features", href: "#product" },
    { label: "AI Showcase", href: "#ai-showcase" },
    { label: "Pricing", href: "#pricing" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Compliance", href: "/compliance" },
    { label: "Early Access", href: "#waitlist" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
} as const;

function XIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.23H2.741l7.731-8.835L1.254 2.25H8.08l4.254 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GdprBanner({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-cura-surface border-t border-white/8 px-4 py-4">
      <div className="container-page flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-white/70 max-w-xl">
          We use analytics cookies to understand how visitors interact with our site. No personal
          data is sold. See our{" "}
          <a href="#" className="underline underline-offset-2 hover:text-white transition-colors">
            Cookie Policy
          </a>{" "}
          for details.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onDecline}
            className="text-sm text-white/50 hover:text-white transition-colors px-4 py-2"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="text-sm font-semibold px-5 py-2 rounded-full bg-cura-accent text-white hover:bg-cura-accent/90 transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show the banner if the user hasn't already made a choice
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setShowBanner(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setShowBanner(false);
  };

  return (
    <>
      {/* HP-057 — Three-column footer */}
      <footer className="bg-cura-base border-t border-white/5">
        <div className="container-page py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cura-accent flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </span>
                <span className="font-semibold text-white text-lg tracking-tight">Cura</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed">
                AI-first recruitment CRM for agencies who win on speed and human connection.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3 mt-2">
                <a
                  href="#"
                  aria-label="Follow Cura on X / Twitter"
                  className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                >
                  <XIcon />
                </a>
                <a
                  href="#"
                  aria-label="Follow Cura on LinkedIn"
                  className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                >
                  <LinkedInIcon />
                </a>
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(LINKS).map(([group, items]) => (
              <div key={group} className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/30">
                  {group}
                </h4>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="text-sm text-white/50 hover:text-white transition-colors"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* HP-058 — Copyright line */}
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/25">
              © 2026 Cura. Built for the humans who build careers.
            </p>
            <p className="text-xs text-white/20">EU AI Act compliant by design.</p>
          </div>
        </div>
      </footer>

      {/* HP-059 — GDPR cookie consent banner */}
      {showBanner && <GdprBanner onAccept={handleAccept} onDecline={handleDecline} />}
    </>
  );
}
