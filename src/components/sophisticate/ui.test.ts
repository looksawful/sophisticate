import { describe, expect, it } from "vitest";
import { ui } from "./ui";

describe("ui style tokens", () => {
  const requiredKeys = [
    "panel",
    "panelStrong",
    "sectionHeader",
    "label",
    "muted",
    "dim",
    "controlBase",
    "buttonGhost",
    "buttonPrimary",
    "buttonDanger",
    "chip",
    "chipActive",
  ];

  it("has all required style tokens", () => {
    for (const key of requiredKeys) {
      expect(ui).toHaveProperty(key);
      expect(typeof (ui as Record<string, string>)[key]).toBe("string");
      expect((ui as Record<string, string>)[key].length).toBeGreaterThan(0);
    }
  });

  it("buttonPrimary includes pink color", () => {
    expect(ui.buttonPrimary).toContain("pink");
  });

  it("buttonDanger includes red color", () => {
    expect(ui.buttonDanger).toContain("red");
  });

  it("chipActive includes pink-500", () => {
    expect(ui.chipActive).toContain("pink-500");
  });
});
