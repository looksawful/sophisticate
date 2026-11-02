/** Policy for global editor shortcuts. Focused controls own their own keys. */
type EditorShortcutInput = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  interactiveTarget: boolean;
  canOpen: boolean;
  canConvert: boolean;
  canClear: boolean;
};

export function decideEditorShortcut(input: EditorShortcutInput): "open" | "process" | "clear" | null {
  if (input.repeat) return null;

  if (
    input.key.toLowerCase() === "o" &&
    (input.ctrlKey || input.metaKey) &&
    !input.altKey &&
    !input.shiftKey
  ) {
    return input.canOpen ? "open" : null;
  }

  if (input.ctrlKey || input.metaKey || input.altKey || input.shiftKey || input.interactiveTarget) {
    return null;
  }

  if (input.key === "Enter" && input.canConvert) return "process";
  if (input.key === "Escape" && input.canClear) return "clear";
  return null;
}
