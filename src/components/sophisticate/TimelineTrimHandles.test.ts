import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TimelineTrimHandles } from "./TimelineTrimHandles";

describe("TimelineTrimHandles", () => {
  it("renders both trim handles at the media boundaries", () => {
    const html = renderToStaticMarkup(
      createElement(TimelineTrimHandles, {
        duration: 10,
        trimStart: 0,
        trimEnd: 10,
        onStartPointerDown: () => {},
        onEndPointerDown: () => {},
      }),
    );

    expect(html).toContain('data-trim-handle="start"');
    expect(html).toContain('data-trim-handle="end"');
    expect(html).toContain('data-trim-handle="start" style="left:0%"');
    expect(html).toContain('data-trim-handle="end" style="left:100%"');
  });

  it("keeps handle positions finite for invalid media values", () => {
    const html = renderToStaticMarkup(
      createElement(TimelineTrimHandles, {
        duration: Number.NaN,
        trimStart: Number.NaN,
        trimEnd: Number.POSITIVE_INFINITY,
        onStartPointerDown: () => {},
        onEndPointerDown: () => {},
      }),
    );

    expect(html).not.toContain("NaN");
    expect(html).toContain('data-trim-handle="start" style="left:0%"');
    expect(html).toContain('data-trim-handle="end" style="left:100%"');
  });
});
