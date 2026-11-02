export type AppShortcut = "open" | "process" | "clear" | null;

type ShortcutEvent = Pick<
  KeyboardEvent,
  "key" | "target" | "ctrlKey" | "metaKey" | "altKey" | "repeat" | "defaultPrevented"
>;

const interactiveSelector =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="slider"], [role="textbox"], [contenteditable="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest(interactiveSelector));
}

/** Resolve window shortcuts without hijacking native keyboard interaction. */
export function getAppShortcut(event: ShortcutEvent, canConvert: boolean, processing = false): AppShortcut {
  if (processing || event.defaultPrevented || event.repeat || event.altKey) return null;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") return "open";
  if (event.ctrlKey || event.metaKey || isInteractiveTarget(event.target)) return null;
  if (event.key === "Enter" && canConvert) return "process";
  if (event.key === "Escape") return "clear";
  return null;
}
