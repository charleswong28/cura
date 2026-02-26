"use client";

/**
 * WaitlistSection — HP-048 through HP-053
 * "Your pipeline won't move itself." — email capture form.
 *
 * HP-048: full-width bg-waitlist gradient (indigo-to-violet)
 * HP-049: headline + subline
 * HP-050: email input, submit, success state with checkmark
 * HP-051: posts to /api/waitlist (Next.js route → NestJS /waitlist)
 * HP-052: email validation + 5-second button cooldown after submit
 * HP-053: social-proof copy beneath the form
 */

import { useState, useRef } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cooldown, setCooldown] = useState(false);

  const startCooldown = () => {
    setCooldown(true);
    cooldownRef.current = setTimeout(() => setCooldown(false), 5000);
  };

  const validate = (): boolean => {
    if (!email.trim()) {
      setFieldError("Please enter your work email.");
      return false;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError("Please enter a valid email address.");
      return false;
    }
    setFieldError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown || status === "loading") return;
    if (!validate()) return;

    setStatus("loading");
    setServerError("");
    startCooldown();

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Something went wrong.");
      }

      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  return (
    <section id="waitlist" className="section-padding bg-waitlist">
      <div className="container-page">
        <div className="mx-auto text-center">
          {/* HP-049 — Headline + subline */}
          <h2 className="text-section-lg font-bold text-white mb-4">
            Your pipeline won&apos;t move itself.
          </h2>
          <p className="text-lg text-white/70 mb-10">
            Join the waitlist. Be first when we open the doors.
          </p>

          {/* HP-050 — Form / success state */}
          {status === "success" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              {/* Animated checkmark */}
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-[fade-in-up_0.4s_ease-out_both]">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-white">You&apos;re on the list.</p>
              <p className="text-white/60">We&apos;ll be in touch as soon as we open the doors.</p>
            </div>
          ) : (
            /* HP-051 + HP-052 — Email form */
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="flex-1 flex flex-col">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldError) setFieldError("");
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="Your work email"
                    aria-label="Work email"
                    className={[
                      "w-full px-4 py-3 rounded-full bg-white/10 border text-white placeholder:text-white/40",
                      "focus:outline-none focus:ring-2 focus:ring-white/40 transition-all",
                      fieldError ? "border-red-400/60" : "border-white/20",
                    ].join(" ")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={cooldown || status === "loading"}
                  className={[
                    "px-6 py-3 rounded-full font-semibold text-sm transition-all",
                    "bg-white text-cura-black hover:bg-white/90 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Joining…
                    </span>
                  ) : (
                    "Request Early Access"
                  )}
                </button>
              </div>

              {/* Inline validation / server error */}
              {(fieldError || serverError) && (
                <p className="mt-3 text-sm text-red-300/90">{fieldError || serverError}</p>
              )}
            </form>
          )}

          {/* HP-053 — Social proof */}
          <p className="mt-8 text-sm text-white/40">Join 200+ agency leaders already on the list</p>
        </div>
      </div>
    </section>
  );
}
