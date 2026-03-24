import type { ScrubEntity } from "../shared/types";
import type { IScrubber } from "./interfaces/IScrubber";
import type { ScrubTextResult } from "./scrubText/ScrubTextResult";

/**
 * Runs an ordered list of {@link IScrubber} steps, merging text and entity lists.
 */
export class Scrubber {
  constructor(private readonly steps: readonly IScrubber[]) {}

  run(input: string): ScrubTextResult {
    let text = input;
    const entities: ScrubEntity[] = [];
    const invalidPatterns: string[] = [];

    for (const step of this.steps) {
      const result = step.scrub(text);
      text = result.text;
      entities.push(...result.entities);
      if (result.invalidPatterns !== undefined) {
        invalidPatterns.push(...result.invalidPatterns);
      }
    }

    return { text, entities, invalidPatterns };
  }
}
