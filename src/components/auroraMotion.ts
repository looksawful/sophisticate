/** Decorative WebGL must not animate for reduced-motion users or hidden tabs. */
export function shouldAnimateAurora(state: { reducedMotion: boolean; documentHidden: boolean }): boolean {
  return !state.reducedMotion && !state.documentHidden;
}
