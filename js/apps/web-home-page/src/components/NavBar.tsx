"use client";

import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Why Cura", href: "#why-cura" },
  { label: "Pricing", href: "#pricing" },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close drawer when clicking outside the header
  useEffect(() => {
    if (!drawerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || drawerOpen
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

          {/* Centre links — desktop only */}
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

          {/* Desktop CTA */}
          <a
            href="#waitlist"
            className="hidden md:inline-flex items-center gap-1 px-5 py-2 rounded-full bg-cura-accent text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            Get Early Access
            <span aria-hidden="true">→</span>
          </a>

          {/* Hamburger button — mobile only */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-md hover:bg-white/5 transition-colors"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <span
              className={`block w-5 h-px bg-cura-white transition-all duration-200 origin-center ${
                drawerOpen ? "rotate-45 translate-y-[3.5px]" : ""
              }`}
            />
            <span
              className={`block w-5 h-px bg-cura-white transition-all duration-200 ${
                drawerOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-5 h-px bg-cura-white transition-all duration-200 origin-center ${
                drawerOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
              }`}
            />
          </button>
        </nav>
      </div>

      {/* Mobile slide-down drawer */}
      <div
        id="mobile-nav-drawer"
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          drawerOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="container-page pb-6 flex flex-col gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={closeDrawer}
              className="py-3 text-base text-cura-muted hover:text-cura-white border-b border-white/5 transition-colors duration-200"
            >
              {label}
            </a>
          ))}
          <a
            href="#waitlist"
            onClick={closeDrawer}
            className="mt-3 inline-flex items-center justify-center gap-1 px-5 py-2.5 rounded-full bg-cura-accent text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            Get Early Access
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </header>
  );
}
