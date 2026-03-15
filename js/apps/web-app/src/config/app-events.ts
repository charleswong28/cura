/**
 * All app-wide events that can be triggered by keyboard shortcuts or UI actions.
 * Add new events here — then register a handler in the app shell layout.
 */
export type AppEvent = "sidebar:toggle" | "command-palette:open";

export const appEvents: AppEvent[] = ["sidebar:toggle", "command-palette:open"];
