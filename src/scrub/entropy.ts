/**
 * Computes Shannon entropy (bits per symbol) for a string.
 *
 * @param s - Input string; empty string yields `0`.
 * @returns Entropy in bits per symbol; higher values suggest more random-looking content.
 */
export function shannonEntropy(s: string): number {
  if (s.length === 0) {
    return 0;
  }
  const freq = new Map<string, number>();
  for (const ch of s) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let h = 0;
  const len = s.length;
  for (const c of freq.values()) {
    const p = c / len;
    h -= p * Math.log2(p);
  }
  return h;
}
