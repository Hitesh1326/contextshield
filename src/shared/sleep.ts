/**
 * Resolves after a fixed delay (used for clipboard / UI settle timing).
 *
 * @param ms - Delay in milliseconds; should be non-negative.
 * @returns A promise that resolves with `void` after the delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
