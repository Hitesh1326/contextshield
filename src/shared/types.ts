export type ShieldState = "idle" | "running" | "warning" | "error";

export interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  context?: unknown;
}

export interface ContextShieldConfig {
  enabled: boolean;
  proxyPort: number;
  additionalDomains: string[];
  detectSecrets: boolean;
  detectPii: boolean;
  enhancedPii: boolean;
  customPatterns: string[];
  blockedPaths: string[];
  logToOutputChannel: boolean;
}
