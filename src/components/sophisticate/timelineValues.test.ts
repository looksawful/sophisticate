import { describe, expect, it } from "vitest";

import { getTimelineValues } from "./timelineValues";

describe("getTimelineValues", () => {
  it("keeps every rendered percentage finite for invalid timeline values", () => {
    expect(getTimelineValues(10, Number.NaN, Number.POSITIVE_INFINITY, Number.NaN)).toEqual({
      timelineMax: 10,
      trimStartPercent: 0,
      trimEndPercent: 100,
      playheadPercent: 0,
    });
  });

  it("preserves ordinary timeline positions", () => {
    expect(getTimelineValues(10, 2, 7, 5)).toEqual({
      timelineMax: 10,
      trimStartPercent: 20,
      trimEndPercent: 70,
      playheadPercent: 50,
    });
  });
});
