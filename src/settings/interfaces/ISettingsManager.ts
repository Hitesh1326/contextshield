import type * as vscode from "vscode";
import type { ContextShieldConfig } from "../../shared/types";

/** Abstraction over workspace and user settings for ContextShield. */
export interface ISettingsManager {
  /** Current resolved configuration. */
  getConfig(): ContextShieldConfig;
  /** Fires when any `contextshield.*` setting changes. */
  onConfigChange(listener: (config: ContextShieldConfig) => void): vscode.Disposable;
}
