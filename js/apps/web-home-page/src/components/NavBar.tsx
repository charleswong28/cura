"use client";

import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Why Cura", href: "#why-cura" },
  { label: "Pricing", href: "#pricing" },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/80 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="container-page">
        <nav
          className="flex items-center justify-between h-16"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <a
            href="/"
            className="font-display text-xl text-cura-white tracking-tight leading-none"
            aria-label="Cura home"
          >
            Cura
          </a>

          {/* Centre links — hidden on mobile (hamburger is HP-006) */}
          <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  className="text-sm text-cura-muted hover:text-cura-white transition-colors duration-200"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA — hidden on mobile */}
          <a
            href="#waitlist"
            className="hidden md:inline-flex items-center gap-1 px-5 py-2 rounded-full bg-cura-accent text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            Get Early Access
            <span aria-hidden="true">→</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
