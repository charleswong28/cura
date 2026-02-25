"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through phases on a fixed loop duration.
 *
 * `timings[i]` is the ms offset from loop start at which phase `i` begins.
 * Phase 0 always starts at t=0 (loop reset). Phases 1..n are scheduled via
 * setTimeout at the given offsets. The whole sequence repeats every `loopMs`.
 *
 * Returns the current 0-based phase index.
 */
export function useAnimationPhases(
  timings: readonly number[],
  loopMs: number
): number {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      setPhase(0);
      timings.slice(1).forEach((ms, i) => {
        timeouts.push(setTimeout(() => setPhase(i + 1), ms));
      });
    };

    run();
    const interval = setInterval(run, loopMs);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
    // timings and loopMs are treated as stable (module-level constants in all usages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return phase;
}
