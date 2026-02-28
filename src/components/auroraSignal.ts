/**
 * Imperative flag checked inside the Aurora WebGL render loop.
 * Setting `paused = true` skips rAF frames → zero GPU work during encoding.
 */
export const auroraSignal = { paused: false };
