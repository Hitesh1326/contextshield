/** Marketplace / package identifier. */
export const EXTENSION_ID = "contextshield";

/** Human-readable name of the VS Code output channel for audit logs. */
export const OUTPUT_CHANNEL_NAME = "ContextShield";

/** Stable command identifiers contributed in `package.json`. */
export const COMMANDS = {
  showOutput: "contextshield.showOutput",
  openSidebar: "contextshield.openSidebar",
  openSettings: "contextshield.openSettings",
  enhancePrompt: "contextshield.enhancePrompt"
} as const;

/** View identifier for the sidebar settings panel. */
export const SETTINGS_VIEW_ID = "contextshield.settingsPanel";

/** UI and validation range for `scrubbingEntropyThreshold` (matches `package.json` minimum/maximum). */
export const SCRUBBING_ENTROPY = {
  min: 1,
  max: 8,
  step: 0.1,
  default: 4.5
} as const;

/** Workbench commands invoked from the settings webview via `runCommand` messages. */
export const WORKBENCH_COMMANDS = {
  openSettings: "workbench.action.openSettings",
  openGlobalKeybindings: "workbench.action.openGlobalKeybindings"
} as const;

/** Commands the settings webview is allowed to run (host-side allowlist). */
export const WEBVIEW_ALLOWED_COMMANDS: ReadonlySet<string> = new Set<string>([
  COMMANDS.showOutput,
  COMMANDS.enhancePrompt,
  WORKBENCH_COMMANDS.openSettings,
  WORKBENCH_COMMANDS.openGlobalKeybindings
]);

/** Keys for `vscode.workspace.getConfiguration()` (match `package.json` `contributes.configuration`). */
export const SETTINGS = {
  enabled: "contextshield.enabled",
  scrubbingPii: "contextshield.scrubbing.pii",
  scrubbingSecrets: "contextshield.scrubbing.secrets",
  scrubbingEntropyThreshold: "contextshield.scrubbing.entropyThreshold",
  scrubbingCustomPatterns: "contextshield.scrubbing.customPatterns",
  llmEnabled: "contextshield.llm.enabled",
  llmModel: "contextshield.llm.model",
  llmSystemPrompt: "contextshield.llm.systemPrompt",
  llmMaxNewTokens: "contextshield.llm.maxNewTokens",
  logToOutputChannel: "contextshield.audit.logToOutputChannel"
} as const;

/** Configuration keys the webview may update via `saveSetting`. */
export const WEBVIEW_ALLOWED_SETTING_KEYS: ReadonlySet<string> = new Set<string>(Object.values(SETTINGS));
