import type { KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts";
import type { AppEvent } from "@/config/app-events";

/**
 * Key-to-event mapping. Each entry binds a shortcut combo to an AppEvent.
 */
export interface ShortcutBinding extends Omit<KeyboardShortcut, "handler"> {
  event: AppEvent;
}

export const shortcutBindings: ShortcutBinding[] = [
  { key: "b", mod: true, event: "sidebar:toggle" },
  { key: "k", mod: true, event: "command-palette:open" },
];
