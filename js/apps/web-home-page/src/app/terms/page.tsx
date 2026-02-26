/**
 * /terms — Terms of Service
 * Early-access terms for the Cura platform.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Cura",
  description: "Terms and conditions governing access to and use of the Cura recruitment platform.",
};

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    content: `By accessing or using Cura ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using Cura on behalf of an organisation, you represent that you have authority to bind that organisation.

If you do not agree to these Terms, do not use the Service.`,
  },
  {
    title: "2. Description of service",
    content: `Cura is an AI-assisted recruitment CRM platform designed for recruitment agencies. The Service includes candidate management, client management, job pipeline tools, AI-generated content assistance, and related features.

During the early-access period, features may change, be removed, or be temporarily unavailable. We will notify early-access users of significant changes by email.`,
  },
  {
    title: "3. Early-access programme",
    content: `Access during the early-access period is provided free of charge or at a reduced rate as indicated at sign-up. Early-access users:

- Accept that the product is in active development and may contain bugs or incomplete features.
- Agree to provide feedback to help improve the platform.
- Understand that pricing, feature availability, and terms may change at general availability with reasonable notice.`,
  },
  {
    title: "4. Accounts and eligibility",
    content: `To use Cura you must:

- Be at least 18 years of age.
- Provide accurate, current, and complete information when creating an account.
- Keep your login credentials secure and notify us immediately of any unauthorised access.

You are responsible for all activity that occurs under your account.`,
  },
  {
    title: "5. Acceptable use",
    content: `You agree not to use the Service to:

- Process personal data in violation of applicable data protection law (including GDPR).
- Discriminate against candidates on the basis of protected characteristics.
- Upload malicious code, conduct denial-of-service attacks, or attempt unauthorised access.
- Scrape, resell, or sublicense the Service without our written consent.
- Use AI-generated outputs as final, unreviewed hiring decisions without human oversight.

We reserve the right to suspend accounts that breach this policy.`,
  },
  {
    title: "6. Data and privacy",
    content: `Your use of the Service is also governed by our Privacy Policy. Where Cura processes personal data on your behalf (e.g. candidate records), we act as a data processor and you act as the data controller. A Data Processing Agreement (DPA) is available on request.

You are responsible for ensuring you have a lawful basis to process candidate and client data within Cura.`,
  },
  {
    title: "7. AI features and human oversight",
    content: `Cura uses AI to assist recruiters — not to replace human judgement. AI-generated content (match scores, draft emails, job briefs) is advisory only. You are responsible for reviewing AI outputs before acting on them.

In compliance with the EU AI Act, Cura maintains audit logs of AI-assisted decisions and provides explanability on request. High-risk decisions are flagged for mandatory human review.`,
  },
  {
    title: "8. Intellectual property",
    content: `**Our IP** — All software, design, trademarks, and content comprising the Cura platform are owned by or licensed to Cura. You receive a limited, non-exclusive, non-transferable licence to use the Service during your subscription.

**Your data** — You retain ownership of all data you upload or create in the platform. We do not claim rights to your recruitment data. On account termination you may request a data export within 30 days.`,
  },
  {
    title: "9. Disclaimers",
    content: `The Service is provided "as is" during the early-access period. To the maximum extent permitted by law, we disclaim all warranties, express or implied, including fitness for a particular purpose.

We do not warrant that the Service will be error-free, uninterrupted, or free of security vulnerabilities, though we take reasonable technical and organisational measures to mitigate these risks.`,
  },
  {
    title: "10. Limitation of liability",
    content: `To the maximum extent permitted by applicable law, Cura's total liability for any claim arising from or related to these Terms or the Service shall not exceed the greater of (a) amounts paid by you in the 12 months preceding the claim, or (b) €100.

We are not liable for indirect, incidental, consequential, or punitive damages, loss of profits, or loss of data.

Nothing in these Terms limits liability for death or personal injury caused by our negligence, or for fraud.`,
  },
  {
    title: "11. Changes to the service and terms",
    content: `We may update these Terms from time to time. Material changes will be communicated at least 14 days in advance by email or in-product notice. Your continued use after the effective date constitutes acceptance of the revised Terms.

We may modify, suspend, or discontinue features of the Service with reasonable notice, except where required by law or urgent security considerations.`,
  },
  {
    title: "12. Termination",
    content: `Either party may terminate the service relationship at any time. On termination, your right to use the Service ceases immediately. We will retain your data for 90 days post-termination to allow export, after which it will be deleted in accordance with our data retention policy.`,
  },
  {
    title: "13. Governing law",
    content: `These Terms are governed by the laws of Ireland and the European Union. Any disputes shall be subject to the exclusive jurisdiction of the Irish courts, except where mandatory consumer protection law in your country of residence provides additional rights.`,
  },
  {
    title: "14. Contact",
    content: `For questions about these Terms, contact us at legal@cura.com.`,
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-white/30">Last updated: 26 February 2026</p>
        </div>

        {/* Intro */}
        <p className="text-body-fluid-lg text-cura-muted leading-relaxed mb-10">
          These Terms of Service govern your access to and use of the Cura platform. Please read
          them carefully before using the Service.
        </p>

        {/* Sections */}
        <div className="flex flex-col gap-10 border-t border-white/8 pt-10">
          {SECTIONS.map((s) => (
            <Section key={s.title} {...s} />
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-14 pt-8 border-t border-white/8 flex flex-wrap gap-6">
          <Link
            href="/privacy"
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            Privacy Policy
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
