"use client";

import { useEffect, useState } from "react";

/**
 * Returns the id of the section currently nearest the top of the viewport.
 * Uses IntersectionObserver with a rootMargin that triggers when a section
 * enters the upper 25 % of the viewport.
 */
export function useScrollSpy(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Join ids for a stable primitive dependency (ids array ref changes each render)
  const idsKey = ids.join(",");

  useEffect(() => {
    const elements = idsKey
      .split(",")
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-10% 0px -75% 0px",
        threshold: 0,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return activeId;
}
