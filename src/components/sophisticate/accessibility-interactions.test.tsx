import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { decideEditorShortcut } from "./editorShortcuts";
import { LogPanel } from "./LogPanel";
import { PreviewPane } from "./PreviewPane";
import type { SophisticateController } from "./useSophisticateController";

const shortcut = {
  key: "Enter",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  interactiveTarget: false,
  canOpen: true,
  canConvert: true,
  canClear: true,
};

describe("keyboard shortcuts", () => {
  it("processes on plain Enter only when focus is not in a control", () => {
    expect(decideEditorShortcut(shortcut)).toBe("process");
    expect(decideEditorShortcut({ ...shortcut, interactiveTarget: true })).toBeNull();
  });

  it("never clears a loaded file when Escape belongs to another control", () => {
    expect(decideEditorShortcut({ ...shortcut, key: "Escape", interactiveTarget: true })).toBeNull();
    expect(decideEditorShortcut({ ...shortcut, key: "Escape", canClear: false })).toBeNull();
    expect(decideEditorShortcut({ ...shortcut, key: "Escape" })).toBe("clear");
  });

  it("ignores key repeats and modified Enter", () => {
    expect(decideEditorShortcut({ ...shortcut, repeat: true })).toBeNull();
    expect(decideEditorShortcut({ ...shortcut, ctrlKey: true })).toBeNull();
  });

  it("retains Ctrl+O / Cmd+O file selection", () => {
    expect(decideEditorShortcut({ ...shortcut, key: "o", ctrlKey: true })).toBe("open");
    expect(decideEditorShortcut({ ...shortcut, key: "O", metaKey: true })).toBe("open");
    expect(decideEditorShortcut({ ...shortcut, key: "o", metaKey: true, canOpen: false })).toBeNull();
  });
});

describe("rendered accessible file and log controls", () => {
  it("names the Dropzone-generated file input", () => {
    const c = {
      videoDuration: 0,
      trimStart: 0,
      trimEnd: 0,
      currentTime: 0,
      fileUrl: "",
      resultUrl: "",
      showResult: false,
      resultBlob: null,
      processing: false,
      cropLabel: "Load a video first",
      canConvert: false,
      handleDropFiles: () => {},
    } as unknown as SophisticateController;
    const markup = renderToStaticMarkup(createElement(PreviewPane, { c }));
    expect(markup).toMatch(/<input(?=[^>]*type="file")(?=[^>]*aria-label="Choose video file")[^>]*>/);
  });

  it("names both filters in the expanded processing log", () => {
    const c = {
      filteredLogs: [],
      logs: [],
      logFilter: "all",
      logQuery: "",
      logsEndRef: { current: null },
      setLogFilter: () => {},
      setLogQuery: () => {},
    } as unknown as SophisticateController;
    const markup = renderToStaticMarkup(createElement(LogPanel, { c }));
    expect(markup).toContain('aria-label="Log filter"');
    expect(markup).toContain('aria-label="Search processing log"');
  });
});
