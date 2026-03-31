import type { ContextShieldConfig } from "../shared/types";

/** Config shape used by {@link scrubText}; mirrors workspace defaults for tests. */
export function defaultScrubConfig(overrides: Partial<ContextShieldConfig> = {}): ContextShieldConfig {
  return {
    enabled: true,
    scrubbingPii: true,
    scrubbingSecrets: true,
    scrubbingEntropyThreshold: 4.5,
    scrubbingCustomPatterns: [],
    llmEnabled: true,
    llmModel: "onnx-community/Llama-3.2-3B-Instruct-ONNX",
    llmSystemPrompt: "",
    llmMaxNewTokens: 1024,
    logToOutputChannel: true,
    ...overrides
  };
}
