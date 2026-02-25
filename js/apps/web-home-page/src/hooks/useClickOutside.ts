"use client";

import { useEffect, RefObject } from "react";

/**
 * Calls `handler` when a mousedown event occurs outside `ref`.
 * The listener is only attached when `active` is true, so it is safe to pass
 * a drawer-open flag — no unnecessary listeners when the drawer is closed.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  active: boolean
): void {
  useEffect(() => {
    if (!active) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [active, handler, ref]);
}
