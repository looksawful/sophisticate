import type { SophisticateController } from "./useSophisticateController";

/**
 * Shallow-compare two controller objects by own-property identity.
 * Returns `true` when they are equal (skip re-render), `false` otherwise.
 */
export function controllerEqual(prev: { c: SophisticateController }, next: { c: SophisticateController }): boolean {
  const a = prev.c;
  const b = next.c;
  const keys = Object.keys(a) as (keyof SophisticateController)[];
  if (keys.length !== Object.keys(b).length) return false;
  for (const k of keys) {
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) return false;
  }
  return true;
}
