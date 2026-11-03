import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("generated MP4 fixtures", () => {
  it.each(["test-320x240-3s.mp4", "test-640x480-2s-noaudio.mp4"])(
    "%s has a valid MP4 header and nonempty media data",
    (filename) => {
      const bytes = readFileSync(resolve(__dirname, "../../test-fixtures", filename));
      expect(bytes.length).toBeGreaterThan(10_000);
      expect(bytes.toString("ascii", 4, 8)).toBe("ftyp");
    },
  );
});
