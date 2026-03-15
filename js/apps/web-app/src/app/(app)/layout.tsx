"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar, MobileSidebar, MobileSidebarTrigger } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { type KeyboardShortcut, useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useMobile } from "@/hooks/use-mobile";
import type { AppEvent } from "@/config/app-events";
import { shortcutBindings } from "@/config/keyboard-shortcuts";

const SIDEBAR_COLLAPSED_KEY = "cura:sidebar-collapsed";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  const toggleCollapse = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
        return next;
      });
    }
  }, [isMobile]);

  const handleCommandPaletteOpen = useCallback(() => {
    // TODO: wire up in EPIC-WA-007
    console.log("[Cura] Command palette triggered — coming in EPIC-WA-007");
  }, []);

  const eventHandlers: Record<AppEvent, () => void> = useMemo(
    () => ({
      "sidebar:toggle": toggleCollapse,
      "command-palette:open": handleCommandPaletteOpen,
    }),
    [toggleCollapse, handleCommandPaletteOpen]
  );

  const shortcuts = useMemo<KeyboardShortcut[]>(
    () => shortcutBindings.map((b) => ({ ...b, handler: eventHandlers[b.event] })),
    [eventHandlers]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleCollapse} />
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onCommandPaletteOpen={handleCommandPaletteOpen}
          mobileNavTrigger={<MobileSidebarTrigger onClick={() => setMobileOpen(true)} />}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
