/**
 * Small pill badge shown at the top of every value-props visual panel (HP-029).
 */
export function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-[0.4rem] bg-cura-accent/15 border border-cura-accent/30 rounded-full px-3 py-1 text-mock-base text-cura-accent-soft mb-5 tracking-[0.05em]">
      {children}
    </div>
  );
}
