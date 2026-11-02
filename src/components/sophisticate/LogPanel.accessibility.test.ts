import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LogPanel } from "./LogPanel";
import type { SophisticateController } from "./useSophisticateController";

describe("processing log accessible names", () => {
  it("names the filter and search controls in the rendered UI", () => {
    const c = {
      filteredLogs: [],
      logs: [],
      logFilter: "all",
      logQuery: "",
      logsEndRef: { current: null },
      setLogFilter: () => {},
      setLogQuery: () => {},
    } as unknown as SophisticateController;

    const html = renderToStaticMarkup(createElement(LogPanel, { c }));
    expect(html).toContain('aria-label="Filter processing logs"');
    expect(html).toContain('aria-label="Search processing logs"');
    expect(html).toContain('for="processing-log-search"');
    expect(html).toContain('id="processing-log-search"');
    expect(html).toContain(">Search processing logs</label>");
  });
});
