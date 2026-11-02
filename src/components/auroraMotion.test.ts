import { describe, expect, it } from "vitest";

import { shouldAnimateAurora } from "./auroraMotion";

describe("decorative Aurora animation policy", () => {
  it("animates only while visible and reduced motion is not requested", () => {
    expect(shouldAnimateAurora({ reducedMotion: false, documentHidden: false })).toBe(true);
    expect(shouldAnimateAurora({ reducedMotion: true, documentHidden: false })).toBe(false);
    expect(shouldAnimateAurora({ reducedMotion: false, documentHidden: true })).toBe(false);
    expect(shouldAnimateAurora({ reducedMotion: true, documentHidden: true })).toBe(false);
  });
});
