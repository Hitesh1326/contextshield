import type { ScrubEntity } from "../../shared/types";

/**
 * Result of one scrubbing step. Optional `invalidPatterns` is used when user-supplied
 * regex strings fail to compile.
 */
export interface ScrubStepResult {
  readonly text: string;
  readonly entities: readonly ScrubEntity[];
  readonly invalidPatterns?: readonly string[];
}

/**
 * Single pass over text (PII, custom regex, JWT, entropy, etc.). Composed in order by {@link Scrubber}.
 */
export interface IScrubber {
  scrub(text: string): ScrubStepResult;
}
