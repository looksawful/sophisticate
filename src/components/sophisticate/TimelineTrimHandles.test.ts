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
});
