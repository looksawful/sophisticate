import { describe, expect, it } from "vitest";

import { getTrimKeyboardValue } from "./trimKeyboard";

describe("keyboard trim semantics", () => {
  it("adjusts handles by 0.1 s and Shift+Arrow by 1 s", () => {
    expect(getTrimKeyboardValue("start", "ArrowRight", false, 2, 8, 10)).toBe(2.1);
    expect(getTrimKeyboardValue("end", "ArrowLeft", true, 2, 8, 10)).toBe(7);
    expect(getTrimKeyboardValue("start", "ArrowUp", true, 2, 8, 10)).toBe(3);
    expect(getTrimKeyboardValue("end", "ArrowDown", false, 2, 8, 10)).toBe(7.9);
  });

  it("clamps to the media boundaries and prevents handle crossing", () => {
    expect(getTrimKeyboardValue("start", "End", false, 0, 2, 10)).toBe(1.9);
    expect(getTrimKeyboardValue("end", "Home", false, 2, 10, 10)).toBe(2.1);
    expect(getTrimKeyboardValue("start", "ArrowLeft", false, 0, 5, 10)).toBe(0);
    expect(getTrimKeyboardValue("end", "ArrowRight", false, 0, 10, 10)).toBe(10);
  });

  it("handles short media and ignores unrelated keys or invalid durations", () => {
    expect(getTrimKeyboardValue("start", "End", false, 0, 0.04, 0.04)).toBe(0);
    expect(getTrimKeyboardValue("end", "Home", false, 0, 0.04, 0.04)).toBe(0.04);
    expect(getTrimKeyboardValue("start", "Enter", false, 1, 2, 10)).toBeNull();
    expect(getTrimKeyboardValue("end", "ArrowLeft", false, 0, 0, Number.NaN)).toBeNull();
  });
});
