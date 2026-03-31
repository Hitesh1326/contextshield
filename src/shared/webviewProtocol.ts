import type { ContextShieldConfig } from "./types";

/** Model load status shown in the settings webview. */
export type WebviewModelStatus = "unknown" | "downloading" | "ready" | "error";

/** Snapshot of settings sent from extension to webview. */
export type WebviewConfigSnapshot = Pick<
  ContextShieldConfig,
  | "enabled"
  | "llmEnabled"
  | "llmModel"
  | "llmSystemPrompt"
  | "llmMaxNewTokens"
  | "scrubbingPii"
  | "scrubbingSecrets"
  | "scrubbingEntropyThreshold"
  | "scrubbingCustomPatterns"
  | "logToOutputChannel"
>;

/** Messages posted from extension host to the webview. */
export type ExtensionToWebviewMessage =
  | {
      type: "state";
      config: WebviewConfigSnapshot;
      modelStatus: WebviewModelStatus;
      defaultSystemPrompt: string;
    }
  | { type: "modelStatus"; status: WebviewModelStatus; detail?: string };

/** Messages posted from webview to extension host. */
export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "downloadModel" }
  | { type: "deleteModelCache" }
  | { type: "saveSetting"; key: string; value: unknown }
  | { type: "runCommand"; command: string; args?: unknown[] };
