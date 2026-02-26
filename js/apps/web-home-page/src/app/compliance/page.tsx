/**
 * HP-043: /compliance placeholder page.
 * Full content to be written post-beta. Linked from ComparisonSection ComplianceBadge.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance — Cura",
  description:
    "How Cura is built for EU AI Act compliance: audit trails, transparent decision logic, and bias safeguards from day one.",
};

export default function CompliancePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center section-padding">
      <div className="container-page text-center max-w-2xl">
        {/* Shield badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cura-accent/15 border border-cura-accent/25 text-3xl mb-8">
          🛡️
        </div>

        <h1 className="font-sans font-semibold text-section-lg text-cura-white leading-tight mb-5">
          Built for compliance. <span className="text-gradient-accent">From day one.</span>
        </h1>

        <p className="text-body-fluid-lg text-cura-muted leading-relaxed mb-10">
          Cura is designed with EU AI Act compliance built in — not bolted on. Full details on our
          audit trails, decision transparency, bias safeguards, and human-in-the-loop architecture
          are coming soon.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-cura-accent-soft text-sm font-medium hover:text-cura-accent transition-colors duration-200"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
