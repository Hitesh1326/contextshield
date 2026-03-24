/** Visual state shown on the status bar item. */
export type PipelineState = "idle" | "scanning" | "done" | "error";

/** Single line written to the audit output channel. */
export interface LogEntry {
  /** Severity for filtering and display. */
  level: "info" | "warn" | "error";
  /** Human-readable message (no PII). */
  message: string;
  /** Optional structured payload (serialized as JSON in the log line). */
  context?: unknown;
}

/** One redacted span recorded for auditing (kind + placeholder label). */
export interface ScrubEntity {
  readonly kind: string;
  readonly placeholder: string;
}

/** Output of the scrubbing pipeline before optional LLM steps. */
export interface ScrubResult {
  readonly text: string;
  readonly entities: readonly ScrubEntity[];
}

/**
 * Resolved extension settings (`contextshield.*` keys in `package.json` `contributes.configuration`).
 */
export interface ContextShieldConfig {
  /** Master switch for ContextShield behavior. */
  enabled: boolean;
  /** When true, apply email/phone/IP/UUID style redaction. */
  scrubbingPii: boolean;
  /** When true, apply JWT and high-entropy token heuristics. */
  scrubbingSecrets: boolean;
  /** Minimum Shannon entropy (bits/symbol) to treat a token as a secret. */
  scrubbingEntropyThreshold: number;
  /** User-supplied regex strings (invalid entries are skipped and logged). */
  scrubbingCustomPatterns: string[];
  /** Reserved for future local LLM integration. */
  llmModel: string;
  /** Reserved for future local LLM integration. */
  llmSystemPrompt: string;
  /** Reserved for future local LLM integration. */
  llmMaxNewTokens: number;
  /** When true, append audit lines to the ContextShield output channel. */
  logToOutputChannel: boolean;
}
