import type { ContextShieldConfig } from "../shared/types";
import { CustomPatternScrubber } from "./CustomPatternScrubber";
import { PiiScrubber } from "./PiiScrubber";
import { Scrubber } from "./Scrubber";
import { SecretScrubber } from "./SecretScrubber";
import type { ScrubTextResult } from "./ScrubTextResult";

export type { ScrubTextResult } from "./ScrubTextResult";

/**
 * Builds the default scrub pipeline: PII → custom patterns → secrets (JWT + entropy).
 */
export function createScrubPipeline(config: ContextShieldConfig): Scrubber {
  return new Scrubber([
    new PiiScrubber(config.scrubbingPii),
    new CustomPatternScrubber(config.scrubbingCustomPatterns),
    new SecretScrubber(config.scrubbingSecrets, config.scrubbingEntropyThreshold)
  ]);
}

/**
 * Redacts PII, secrets, and custom patterns according to workspace `ContextShieldConfig`.
 *
 * @param input - Raw text to scan.
 * @param config - Feature toggles and thresholds from workspace settings.
 * @returns Redacted text, entity list, and any invalid regex patterns from the user.
 */
export function scrubText(input: string, config: ContextShieldConfig): ScrubTextResult {
  return createScrubPipeline(config).run(input);
}
