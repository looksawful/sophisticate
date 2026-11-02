import { describe, expect, it } from "vitest";
import { getAuroraMode } from "./auroraMode";

describe("Aurora animation policy", () => {
  it("animates only when visible and motion is allowed", () => {
    expect(getAuroraMode(false, false)).toBe("animate");
    expect(getAuroraMode(true, false)).toBe("static");
    expect(getAuroraMode(false, true)).toBe("paused");
    expect(getAuroraMode(true, true)).toBe("paused");
  });
});
