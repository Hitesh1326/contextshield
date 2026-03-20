export const EXTENSION_ID = "contextshield";
export const OUTPUT_CHANNEL_NAME = "ContextShield";

export const COMMANDS = {
  showOutput: "contextshield.showOutput",
  enableProxyInterception: "contextshield.enableProxyInterception"
} as const;

export const SETTINGS = {
  enabled: "contextshield.enabled",
  proxyPort: "contextshield.proxy.port",
  additionalDomains: "contextshield.proxy.additionalDomains",
  detectSecrets: "contextshield.shield.detectSecrets",
  detectPii: "contextshield.shield.detectPii",
  enhancedPii: "contextshield.shield.enhancedPii",
  customPatterns: "contextshield.shield.customPatterns",
  blockedPaths: "contextshield.sandbox.blockedPaths",
  logToOutputChannel: "contextshield.audit.logToOutputChannel"
} as const;
