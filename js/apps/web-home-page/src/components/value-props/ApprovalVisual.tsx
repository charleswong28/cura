/**
 * ApprovalVisual — interactive approve/reset toggle for "Human-in-the-Loop" pillar (HP-028).
 */
"use client";

import { useState } from "react";
import { IconBadge } from "./IconBadge";

export function ApprovalVisual() {
  const [approved, setApproved] = useState(false);

  return (
    <div className="dark-panel">
      <IconBadge>🛡️ Human-in-the-Loop</IconBadge>

      {!approved ? (
        <>
          <div className="text-mock-2xl font-semibold text-cura-white/90 mb-[0.2rem]">
            Submission draft ready
          </div>
          <div className="text-mock-base text-cura-white/40 mb-4">
            Priya M. → Northstar Capital · CFO role
          </div>

          {/* Email preview */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-[0.9rem] mb-4">
            <div className="text-mock-sm text-cura-white/30 mb-2">
              To: Marcus Webb &lt;m.webb@northstar.com&gt;
            </div>
            <div className="text-mock-base text-cura-white/60 leading-[1.65]">
              Hi Marcus, I&apos;d like to put forward Priya Mehta for the CFO
              role. Her track record in SaaS finance leadership is exceptional —
              3× revenue growth at her last firm...
            </div>
            <div className="mt-2 h-[0.9rem] bg-gradient-to-b from-transparent to-black/25 rounded-sm" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              className="border border-white/10 rounded-[0.4rem] p-[0.6rem] text-mock-xl text-cura-white/55 bg-white/6 cursor-pointer [flex:1]"
            >
              Edit Draft
            </button>
            <button
              onClick={() => setApproved(true)}
              className="rounded-[0.4rem] py-[0.6rem] px-4 text-mock-xl font-semibold text-white bg-cura-accent border-0 cursor-pointer [flex:2]"
            >
              Approve &amp; Send →
            </button>
          </div>

          <div className="mt-3 text-mock-sm text-cura-white/28 text-center">
            You have final approval on every send. No autonomous actions.
          </div>
        </>
      ) : (
        <div className="text-center py-8 px-4 animate-[fade-in-up_0.4s_ease_both]">
          <div className="text-[1.75rem] mb-2 text-cura-accent">✓</div>
          <div className="text-mock-3xl font-semibold text-cura-white/90">
            Sent to Marcus Webb
          </div>
          <div className="text-mock-base text-cura-white/40 mt-1">
            Priya M. submission · just now
          </div>
          <button
            onClick={() => setApproved(false)}
            className="mt-6 text-[0.65rem] text-cura-accent-soft bg-transparent border-0 cursor-pointer underline"
          >
            Reset demo
          </button>
        </div>
      )}
    </div>
  );
}
