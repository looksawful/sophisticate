import { describe, expect, it } from "vitest";
import { validateProcessingRequest } from "./processingRequest";

const valid = {
  duration: 12,
  videoWidth: 1920,
  videoHeight: 1080,
  sizeLimitEnabled: true,
  maxSize: "10",
} as const;

describe("validateProcessingRequest", () => {
  it.each(["", "0", "-1", "nope"])("rejects invalid enabled max size %j", (maxSize) => {
    expect(() => validateProcessingRequest({ ...valid, maxSize })).toThrow(/max size/i);
  });

  it("rejects NaN max size instead of silently choosing a default", () => {
    expect(() => validateProcessingRequest({ ...valid, maxSize: "NaN" })).toThrow(/max size/i);
  });

  it.each([
    { duration: 0, videoWidth: 1920, videoHeight: 1080 },
    { duration: Number.NaN, videoWidth: 1920, videoHeight: 1080 },
    { duration: 12, videoWidth: 0, videoHeight: 1080 },
    { duration: 12, videoWidth: 1920, videoHeight: Number.NaN },
  ])("rejects invalid media metadata %#", (metadata) => {
    expect(() => validateProcessingRequest({ ...valid, ...metadata })).toThrow(/metadata/i);
  });

  it("omits maxSizeMB when size limiting is disabled", () => {
    expect(validateProcessingRequest({ ...valid, sizeLimitEnabled: false, maxSize: "nonsense" }).maxSizeMB).toBeUndefined();
  });

  it("returns explicit numeric values for a valid request", () => {
    expect(validateProcessingRequest(valid)).toEqual({
      duration: 12,
      videoWidth: 1920,
      videoHeight: 1080,
      maxSizeMB: 10,
    });
  });
});
