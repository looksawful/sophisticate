import { describe, expect, it } from "vitest";
import { getUserStatus } from "./userStatus";

describe("screen reader processing status", () => {
  it("announces meaningful transitions, never raw FFmpeg details", () => {
    expect(getUserStatus(true, false, [{ text: "[ffmpeg] frame=123" }])).toEqual({
      status: "Processing video",
      error: "",
    });
    expect(getUserStatus(false, true, [{ text: "[complete] ready" }]).status).toBe("Video ready to download");
    expect(getUserStatus(false, false, [{ text: "[cancelled] processing stopped" }]).status).toBe("Processing cancelled");
  });

  it("surfaces only the latest blocking error", () => {
    expect(getUserStatus(false, false, [{ text: "[error] Unsupported video" }]).error).toBe("Unsupported video");
    expect(getUserStatus(false, false, [
      { text: "[error] Past failure" },
      { text: "[input] new file" },
    ]).error).toBe("");
  });
});
