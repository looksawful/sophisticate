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
        onTrimChange: () => {},
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
        onTrimChange: () => {},
      }),
    );

    expect(html).not.toContain("NaN");
    expect(html).toContain('data-trim-handle="start" style="left:0%"');
    expect(html).toContain('data-trim-handle="end" style="left:100%"');
  });
  it("exposes each endpoint as a named, keyboard-focusable slider", () => {
    const html = renderToStaticMarkup(
      createElement(TimelineTrimHandles, {
        duration: 10,
        trimStart: 2,
        trimEnd: 8,
        onStartPointerDown: () => {},
        onEndPointerDown: () => {},
        onTrimChange: () => {},
      }),
    );
    expect(html).toContain('aria-label="Trim start"');
    expect(html).toContain('aria-label="Trim end"');
    expect(html.match(/role="slider"/g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/g)).toHaveLength(2);
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain('aria-valuenow="8"');
  });

});
