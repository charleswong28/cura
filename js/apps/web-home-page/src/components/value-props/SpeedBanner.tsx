/**
 * SpeedBanner — full-width counter banner with IntersectionObserver (HP-030, HP-031).
 * Animates a "3 hrs" counter when scrolled into view.
 */
"use client";

import { useEffect, useRef, useState } from "react";

export function SpeedBanner() {
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
    <div ref={ref} className="bg-speed-banner py-20">
      <div className="container-page text-center">
        <div className="text-speed-counter font-bold text-cura-white leading-none tracking-[-0.02em]">
          {count}{" "}
          <span className="text-speed-unit text-cura-white/65">hrs</span>
        </div>
        <p className="text-body-fluid-lg text-cura-white/75 mt-5 mx-auto leading-[1.6]">
          Recruiters using Cura reclaim an average of{" "}
          <strong className="text-cura-white">3 hours per day.</strong>
        </p>
        <p className="text-mock-lg text-cura-white/30 mt-6">
          * Based on time-tracking data across beta cohort, Q4 2025.
        </p>
      </div>
    </div>
  );
}
