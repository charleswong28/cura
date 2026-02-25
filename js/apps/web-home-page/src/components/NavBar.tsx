"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { useClickOutside } from "@/hooks/useClickOutside";

const NAV_LINKS = [
  { label: "Why Cura", href: "#why-cura" },
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
];

const NAV_IDS = NAV_LINKS.map((l) => l.href.slice(1));

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Scroll-state detection — simple, stays inline
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const activeSection = useScrollSpy(NAV_IDS);
  useClickOutside(headerRef, () => setDrawerOpen(false), drawerOpen);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || drawerOpen
          ? "bg-black/85 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.5)]"
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
            className="flex items-center gap-2 select-none"
            aria-label="Cura home"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="10" fill="#6366F1" />
              <circle cx="10" cy="10" r="4" fill="#F5F5F3" />
            </svg>
            <span className="font-sans font-medium text-[15px] text-cura-white tracking-[-0.01em] leading-none">
              Cura
            </span>
          </a>

          {/* Centre links — desktop only */}
          <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = activeSection === href.slice(1);
              return (
                <li key={label}>
                  <a
                    href={href}
                    aria-current={isActive ? "true" : undefined}
                    className={`text-sm transition-colors duration-200 ${
                      isActive
                        ? "text-cura-white"
                        : scrolled
                          ? "text-white/60 hover:text-cura-white"
                          : "text-cura-muted hover:text-cura-white"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <span className="block h-px bg-cura-accent mt-0.5 rounded-full" />
                    )}
                  </a>
                </li>
              );
            })}
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
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = activeSection === href.slice(1);
            return (
              <a
                key={label}
                href={href}
                onClick={closeDrawer}
                aria-current={isActive ? "true" : undefined}
                className={`py-3 text-base border-b border-white/5 transition-colors duration-200 ${
                  isActive
                    ? "text-cura-white font-medium"
                    : "text-cura-muted hover:text-cura-white"
                }`}
              >
                {label}
              </a>
            );
          })}
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
