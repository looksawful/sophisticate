export type AuroraMode = "animate" | "static" | "paused";

/** A decorative effect must not animate with reduced motion or when hidden. */
export function getAuroraMode(prefersReducedMotion: boolean, documentHidden: boolean): AuroraMode {
  if (documentHidden) return "paused";
  return prefersReducedMotion ? "static" : "animate";
}
