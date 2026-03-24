/** Marketplace / package identifier. */
export const EXTENSION_ID = "contextshield";

/** Human-readable name of the VS Code output channel for audit logs. */
export const OUTPUT_CHANNEL_NAME = "ContextShield";

/** Stable command identifiers contributed in `package.json`. */
export const COMMANDS = {
  showOutput: "contextshield.showOutput",
  enhancePrompt: "contextshield.enhancePrompt"
} as const;

/** Keys for `vscode.workspace.getConfiguration()` (match `package.json` `contributes.configuration`). */
export const SETTINGS = {
  enabled: "contextshield.enabled",
  scrubbingPii: "contextshield.scrubbing.pii",
  scrubbingSecrets: "contextshield.scrubbing.secrets",
  scrubbingEntropyThreshold: "contextshield.scrubbing.entropyThreshold",
  scrubbingCustomPatterns: "contextshield.scrubbing.customPatterns",
  llmModel: "contextshield.llm.model",
  llmSystemPrompt: "contextshield.llm.systemPrompt",
  llmMaxNewTokens: "contextshield.llm.maxNewTokens",
  logToOutputChannel: "contextshield.audit.logToOutputChannel"
} as const;
