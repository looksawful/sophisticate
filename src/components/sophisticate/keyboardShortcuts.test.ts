import { describe, expect, it } from "vitest";

import { getAppShortcut } from "./keyboardShortcuts";

function event(key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    target: null,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    defaultPrevented: false,
    ...overrides,
  } as KeyboardEvent;
}

const interactive = { closest: () => ({}) } as unknown as EventTarget;

describe("global keyboard shortcuts", () => {
  it("processes Enter only when focus is outside interactive controls", () => {
    expect(getAppShortcut(event("Enter"), true)).toBe("process");
    expect(getAppShortcut(event("Enter", { target: interactive }), true)).toBeNull();
    expect(getAppShortcut(event("Enter"), false)).toBeNull();
  });

  it("never clears video when a control owns Escape", () => {
    expect(getAppShortcut(event("Escape"), true)).toBe("clear");
    expect(getAppShortcut(event("Escape", { target: interactive }), true)).toBeNull();
  });

  it("preserves Ctrl+O / Command+O from controls", () => {
    expect(getAppShortcut(event("o", { ctrlKey: true, target: interactive }), false)).toBe("open");
    expect(getAppShortcut(event("O", { metaKey: true, target: interactive }), false)).toBe("open");
  });

  it("ignores repeated, prevented and modifier keypresses", () => {
    expect(getAppShortcut(event("Enter", { repeat: true }), true)).toBeNull();
    expect(getAppShortcut(event("Enter", { defaultPrevented: true }), true)).toBeNull();
    expect(getAppShortcut(event("Enter", { altKey: true }), true)).toBeNull();
    expect(getAppShortcut(event("Enter", { ctrlKey: true }), true)).toBeNull();
    expect(getAppShortcut(event("Escape", { metaKey: true }), true)).toBeNull();
  });
});
