"use client";

import { useCallback, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { type KeyboardShortcut, useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { AppEvent } from "@/config/app-events";
import { shortcutBindings } from "@/config/keyboard-shortcuts";

const SIDEBAR_COLLAPSED_KEY = "cura:sidebar-collapsed";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  const eventHandlers: Record<AppEvent, () => void> = useMemo(
    () => ({
      "sidebar:toggle": toggleCollapse,
      "command-palette:open": () => {
        // TODO: wire up in EPIC-WA-007
      },
    }),
    [toggleCollapse]
  );

  const shortcuts = useMemo<KeyboardShortcut[]>(
    () => shortcutBindings.map((b) => ({ ...b, handler: eventHandlers[b.event] })),
    [eventHandlers]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleCollapse} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
