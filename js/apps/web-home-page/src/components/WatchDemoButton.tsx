"use client";

/**
 * WatchDemoButton — HP-016
 *
 * Ghost link that opens a fullscreen modal with a demo video placeholder.
 * Closes on backdrop click or Escape key.
 */
import { useEffect, useRef, useState } from "react";

export default function WatchDemoButton() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync <dialog> open state and Escape-key handling
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  // Close when <dialog> fires its native 'close' event (e.g. Esc key)
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => setOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-cura-white/50 hover:text-cura-white transition-colors duration-200 cursor-pointer bg-transparent border-0 p-0"
      >
        Watch 90-second demo{" "}
        <span aria-hidden="true">▶</span>
      </button>

      {/* Modal — HP-016 */}
      <dialog
        ref={dialogRef}
        aria-label="Product demo video"
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="m-auto w-full max-w-3xl rounded-2xl border-0 p-0 bg-transparent backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <div className="relative rounded-2xl overflow-hidden bg-cura-black border border-cura-accent/25">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close demo"
            className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm bg-cura-white/8 text-cura-white/60 transition-colors duration-150 cursor-pointer border-0"
          >
            ✕
          </button>

          {/* Video placeholder — aspect-video replaces the padding-bottom: 56.25% hack */}
          <div className="relative w-full aspect-video">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {/* Play icon */}
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-cura-accent/15 border border-cura-accent/40">
                <span
                  className="text-3xl leading-none text-cura-accent pl-1"
                  aria-hidden="true"
                >
                  ▶
                </span>
              </div>
              <p className="text-sm uppercase text-cura-white/30 tracking-[0.15em]">
                Demo coming soon
              </p>
            </div>
          </div>

          {/* Caption */}
          <div className="px-8 py-5 text-center text-sm text-cura-white/40 border-t border-cura-white/[6%]">
            A 90-second walkthrough of Cura moving a candidate from sourced to offer — without a single manual click.
          </div>
        </div>
      </dialog>
    </>
  );
}
