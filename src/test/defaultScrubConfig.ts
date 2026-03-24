import type { ContextShieldConfig } from "../shared/types";

/** Config shape used by {@link scrubText}; mirrors workspace defaults for tests. */
export function defaultScrubConfig(overrides: Partial<ContextShieldConfig> = {}): ContextShieldConfig {
  return {
    enabled: true,
    scrubbingPii: true,
    scrubbingSecrets: true,
    scrubbingEntropyThreshold: 4.5,
    scrubbingCustomPatterns: [],
    llmModel: "",
    llmSystemPrompt: "",
    llmMaxNewTokens: 1024,
    logToOutputChannel: true,
    ...overrides
  };
}
