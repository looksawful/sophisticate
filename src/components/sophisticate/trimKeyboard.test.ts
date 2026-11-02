import { describe, expect, it } from "vitest";

import { trimRangeFromKeyboard } from "./trimKeyboard";

const base = {
  duration: 10,
  start: 2,
  end: 8,
  shiftKey: false,
};

describe("keyboard trim boundary policy", () => {
  it("moves the requested endpoint by 0.1 s, or 1 s with Shift", () => {
    expect(trimRangeFromKeyboard({ ...base, handle: "start", key: "ArrowRight" })?.start).toBeCloseTo(2.1);
    expect(trimRangeFromKeyboard({ ...base, handle: "start", key: "ArrowLeft", shiftKey: true })?.start).toBeCloseTo(1);
    expect(trimRangeFromKeyboard({ ...base, handle: "end", key: "ArrowLeft" })?.end).toBeCloseTo(7.9);
    expect(trimRangeFromKeyboard({ ...base, handle: "end", key: "ArrowRight", shiftKey: true })?.end).toBeCloseTo(9);
  });

  it("clamps against the other handle and leaves it fixed", () => {
    expect(trimRangeFromKeyboard({ ...base, handle: "start", start: 7.95, key: "ArrowRight" })).toEqual({
      start: 7.9,
      end: 8,
    });
    expect(trimRangeFromKeyboard({ ...base, handle: "end", end: 2.05, key: "ArrowLeft" })).toEqual({
      start: 2,
      end: 2.1,
    });
  });

  it("supports Home / End without crossing trim handles", () => {
    expect(trimRangeFromKeyboard({ ...base, handle: "start", key: "Home" })).toEqual({ start: 0, end: 8 });
    expect(trimRangeFromKeyboard({ ...base, handle: "start", key: "End" })).toEqual({ start: 7.9, end: 8 });
    expect(trimRangeFromKeyboard({ ...base, handle: "end", key: "Home" })).toEqual({ start: 2, end: 2.1 });
    expect(trimRangeFromKeyboard({ ...base, handle: "end", key: "End" })).toEqual({ start: 2, end: 10 });
  });

  it("supports clips shorter than the nominal minimum gap", () => {
    expect(
      trimRangeFromKeyboard({ duration: 0.05, start: 0, end: 0.05, shiftKey: false, handle: "start", key: "ArrowRight" }),
    ).toEqual({ start: 0, end: 0.05 });
  });

  it("ignores unrelated keys and invalid duration", () => {
    expect(trimRangeFromKeyboard({ ...base, handle: "start", key: "Enter" })).toBeNull();
    expect(trimRangeFromKeyboard({ ...base, handle: "start", key: "ArrowRight", duration: 0 })).toBeNull();
  });
});
