import type { ScrubEntity } from "../shared/types";
import type { IScrubber, ScrubStepResult } from "./interfaces/IScrubber";

/**
 * Applies user-supplied regex patterns from settings. Invalid patterns are collected, not thrown.
 */
export class CustomPatternScrubber implements IScrubber {
  constructor(private readonly patterns: readonly string[]) {}

  scrub(text: string): ScrubStepResult {
    const entities: ScrubEntity[] = [];
    const invalidPatterns: string[] = [];
    const placeholder = "[CUSTOM]";
    let out = text;

    for (const pattern of this.patterns) {
      const trimmed = pattern.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const re = new RegExp(trimmed, "g");
        out = out.replace(re, () => {
          entities.push({ kind: "custom_pattern", placeholder });
          return placeholder;
        });
      } catch {
        invalidPatterns.push(trimmed);
      }
    }

    return {
      text: out,
      entities,
      invalidPatterns: invalidPatterns.length > 0 ? invalidPatterns : undefined
    };
  }
}
