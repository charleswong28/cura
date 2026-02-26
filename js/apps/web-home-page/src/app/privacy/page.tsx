/**
 * /privacy — Privacy Policy
 * GDPR-compliant privacy notice for Cura early-access users.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Cura",
  description:
    "How Cura collects, uses, and protects your personal data. GDPR-compliant privacy notice.",
};

const SECTIONS = [
  {
    title: "1. Who we are",
    content: `Cura ("we", "us", "our") is an AI-first recruitment CRM platform operated in early access. We are the data controller for personal data collected through cura.com and our associated services.

Contact: privacy@cura.com`,
  },
  {
    title: "2. Data we collect",
    content: `We may collect the following categories of personal data:

**Contact & account data** — name, work email address, company name, and job title provided via our early-access waitlist or sign-up form.

**Usage data** — pages visited, features used, session duration, and interaction events collected via analytics cookies (only with your consent).

**Candidate & client data** — recruitment records (CVs, contact details, notes, job specifications) entered by recruiters using the Cura platform. This data is processed on behalf of our customers as a data processor.

**Technical data** — IP address, browser type, operating system, and referring URL collected automatically for security and diagnostics.`,
  },
  {
    title: "3. Legal basis for processing",
    content: `We process your personal data on the following legal bases under GDPR Article 6:

- **Contract performance** — to provide the Cura service you have signed up for.
- **Legitimate interests** — to improve our product, prevent fraud, and communicate service updates.
- **Consent** — for analytics cookies and non-essential communications. You may withdraw consent at any time.
- **Legal obligation** — where required by applicable law.`,
  },
  {
    title: "4. How we use your data",
    content: `We use your personal data to:

- Operate and deliver the Cura platform
- Send onboarding and product update emails (you can unsubscribe at any time)
- Analyse usage patterns to improve the product
- Respond to support requests
- Comply with legal obligations and enforce our Terms of Service`,
  },
  {
    title: "5. AI processing",
    content: `Cura uses AI to assist with recruitment workflows (e.g. candidate matching, job brief drafting). Our AI systems are designed in accordance with the EU AI Act:

- Decisions that materially affect candidates are flagged for human review.
- We do not use biometric data or protected characteristics as scoring inputs.
- Audit logs are maintained for all AI-assisted decisions.
- You can request an explanation of any AI-generated output at any time.`,
  },
  {
    title: "6. Data sharing",
    content: `We do not sell your personal data. We may share data with:

- **Service providers** — infrastructure, analytics, and communication tools operating under data processing agreements (DPAs).
- **Law enforcement** — where required by a valid legal request.
- **Business transfers** — in the event of a merger or acquisition, with notice to you.

All third-party processors are contractually bound to GDPR-compliant standards.`,
  },
  {
    title: "7. Data retention",
    content: `We retain personal data for as long as necessary to fulfil the purposes described above:

- **Waitlist data** — until you request deletion or 24 months after last interaction.
- **Account data** — for the duration of your subscription plus 90 days post-termination.
- **Analytics data** — up to 14 months in aggregated, pseudonymous form.

You may request deletion at any time (see section 8).`,
  },
  {
    title: "8. Your rights",
    content: `Under GDPR, you have the right to:

- **Access** — request a copy of your personal data.
- **Rectification** — correct inaccurate data.
- **Erasure** — request deletion ("right to be forgotten").
- **Restriction** — limit how we process your data.
- **Portability** — receive your data in a machine-readable format.
- **Objection** — object to processing based on legitimate interests.
- **Withdraw consent** — for any consent-based processing at any time.

To exercise any right, email **privacy@cura.com**. We will respond within 30 days.

You also have the right to lodge a complaint with your national data protection authority.`,
  },
  {
    title: "9. Cookies",
    content: `We use essential and analytics cookies. See our Cookie Policy for full details on what we set, why, and how to manage your preferences.`,
  },
  {
    title: "10. Changes to this policy",
    content: `We may update this policy as our product evolves. Material changes will be communicated by email (if you have an account) or by a notice on our website at least 14 days before they take effect. The "last updated" date below reflects the most recent revision.`,
  },
];

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-white/80">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-white/90">{title}</h2>
      <div className="flex flex-col gap-2">
        {content.split("\n\n").map((para, i) => (
          <p key={i} className="text-sm text-white/55 leading-relaxed whitespace-pre-line">
            {renderBold(para)}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-white/30">Last updated: 26 February 2026</p>
        </div>

        {/* Intro */}
        <p className="text-body-fluid-lg text-cura-muted leading-relaxed mb-10">
          Your privacy matters to us. This notice explains what personal data Cura collects, how we
          use it, and the rights you hold under the General Data Protection Regulation (GDPR) and
          applicable data protection law.
        </p>

        {/* Sections */}
        <div className="flex flex-col gap-10 border-t border-white/8 pt-10">
          {SECTIONS.map((s) => (
            <Section key={s.title} {...s} />
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-14 pt-8 border-t border-white/8 flex flex-wrap gap-6">
          <Link href="/terms" className="text-sm text-white/40 hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link
            href="/cookies"
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            Cookie Policy
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
