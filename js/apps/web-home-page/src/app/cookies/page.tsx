/**
 * /cookies — Cookie Policy
 * Explains what cookies Cura sets, why, and how to manage preferences.
 * Referenced from the GDPR consent banner in Footer.tsx.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Cura",
  description:
    "What cookies Cura sets, why we use them, and how to manage your cookie preferences.",
};

const COOKIE_TABLE = [
  {
    name: "cura-cookie-consent",
    type: "Essential",
    purpose: "Stores your cookie consent choice (accepted / declined). Expires after 12 months.",
    duration: "12 months",
  },
  {
    name: "__session",
    type: "Essential",
    purpose: "Maintains your authenticated session when logged in to the Cura platform.",
    duration: "Session",
  },
  {
    name: "_cura_analytics",
    type: "Analytics",
    purpose:
      "Pseudonymous usage analytics — pages visited, feature interactions, session duration. Only set with your consent.",
    duration: "14 months",
  },
];

export default function CookiesPage() {
  return (
    <main className="min-h-screen section-padding">
      <div className="container-page max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-cura-accent-soft text-sm font-medium hover:text-cura-accent transition-colors duration-200 mb-8"
          >
            ← Back to home
          </Link>
          <h1 className="font-sans font-semibold text-section-lg text-cura-white leading-tight mb-3">
            Cookie Policy
          </h1>
          <p className="text-sm text-white/30">Last updated: 26 February 2026</p>
        </div>

        {/* Intro */}
        <p className="text-body-fluid-lg text-cura-muted leading-relaxed mb-10">
          This Cookie Policy explains what cookies are, which ones Cura uses, and how you can
          control them. We keep our cookie footprint minimal — essential cookies only by default,
          with analytics only if you choose to accept.
        </p>

        <div className="flex flex-col gap-10 border-t border-white/8 pt-10">
          {/* What are cookies */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-white/90">1. What are cookies?</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              Cookies are small text files stored in your browser when you visit a website. They
              allow websites to remember information about your visit — such as your preferences or
              session state — to improve your experience on return visits.
            </p>
          </section>

          {/* Cookies we use */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white/90">2. Cookies we use</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              We use two categories of cookies: essential and analytics.
            </p>

            {/* Cookie table */}
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                      Cookie
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                      Purpose
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIE_TABLE.map((row, i) => (
                    <tr
                      key={row.name}
                      className={i < COOKIE_TABLE.length - 1 ? "border-b border-white/5" : ""}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-cura-accent-soft whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">{row.type}</td>
                      <td className="px-4 py-3 text-white/50">{row.purpose}</td>
                      <td className="px-4 py-3 text-white/40 whitespace-nowrap">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Essential cookies */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-white/90">3. Essential cookies</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              Essential cookies are required for the website to function. They include your consent
              preference and session authentication. These are set without requiring your consent
              because they are strictly necessary to provide the service you requested, in
              accordance with GDPR Recital 47 and ePrivacy Directive Article 5(3).
            </p>
          </section>

          {/* Analytics cookies */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-white/90">4. Analytics cookies</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              Analytics cookies help us understand how visitors interact with our site — which pages
              are most visited, where users drop off, and how features are used. This data is
              pseudonymous and aggregated; we do not use it to identify individual users or sell it
              to third parties.
            </p>
            <p className="text-sm text-white/55 leading-relaxed">
              Analytics cookies are only set if you click{" "}
              <strong className="text-white/70">Accept</strong> in the consent banner. If you click
              Decline, no analytics cookies are set.
            </p>
          </section>

          {/* Managing preferences */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-white/90">5. Managing your preferences</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              When you first visit cura.com, a consent banner appears at the bottom of the screen.
              You can accept or decline analytics cookies at that point.
            </p>
            <p className="text-sm text-white/55 leading-relaxed">
              To change your choice later, clear the{" "}
              <code className="font-mono text-xs text-cura-accent-soft bg-white/5 px-1.5 py-0.5 rounded">
                cura-cookie-consent
              </code>{" "}
              key from your browser&apos;s localStorage (DevTools → Application → Local Storage →
              cura.com) and reload the page. The consent banner will reappear.
            </p>
            <p className="text-sm text-white/55 leading-relaxed">
              You can also manage or delete cookies through your browser settings. Note that
              deleting essential cookies may affect site functionality.
            </p>
          </section>

          {/* Third-party */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-white/90">6. Third-party cookies</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              We do not currently embed third-party advertising or social media cookies. Any
              analytics tooling we use operates under a Data Processing Agreement and is configured
              to respect your consent choice. This policy will be updated if third-party cookies are
              introduced.
            </p>
          </section>

          {/* Contact */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-white/90">7. Contact</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              Questions about our cookie practices? Email us at{" "}
              <a
                href="mailto:privacy@cura.com"
                className="text-cura-accent-soft hover:text-cura-accent transition-colors"
              >
                privacy@cura.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-14 pt-8 border-t border-white/8 flex flex-wrap gap-6">
          <Link
            href="/privacy"
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-sm text-white/40 hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link
            href="/compliance"
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            Compliance
          </Link>
        </div>
      </div>
    </main>
  );
}
