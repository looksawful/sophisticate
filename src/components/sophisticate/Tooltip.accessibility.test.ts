import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Tooltip } from "./Tooltip";

describe("Tooltip accessible description", () => {
  it("links the rendered trigger to its tooltip description", () => {
    const html = renderToStaticMarkup(
      createElement(Tooltip, {
        text: "Sets maximum output file size",
        children: createElement("button", { type: "button" }, "Size limit"),
      }),
    );
    const id = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("Sets maximum output file size");
  });
});
