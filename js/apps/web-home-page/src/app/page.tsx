/**
 * Home page — HP-008
 *
 * Scroll order (matches Section Map in home-page-project-management.md):
 *  1. HeroSection          — "AI Runs the ATS. You Close the Deal."
 *  2. ProblemSection       — "Your competitors close deals…"          #why-cura
 *  3. ValuePropsSection    — Three-pillar AI features + speed banner  #product
 *  4. ReplaceStackSection  — "One brain. Not five tools."
 *  5. AIShowcase           — Match · Draft · Brief tabs + keyboard
 *  6. ComparisonSection    — Feature table + compliance badge
 *  7. TestimonialsSection  — Quotes · logos · star rating
 *  8. PricingTeaser        — Plan preview                             #pricing
 *  9. WaitlistSection      — Email capture form                       #waitlist
 * 10. Footer               — Links · copyright · GDPR banner
 *
 * NavBar (sticky, with scroll-spy) is rendered in layout.tsx.
 */
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import ValuePropsSection from "@/components/ValuePropsSection";
import ReplaceStackSection from "@/components/ReplaceStackSection";
import AIShowcase from "@/components/AIShowcase";
import ComparisonSection from "@/components/ComparisonSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingTeaser from "@/components/PricingTeaser";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <ValuePropsSection />
      <ReplaceStackSection />
      <AIShowcase />
      <ComparisonSection />
      <TestimonialsSection />
      <PricingTeaser />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
