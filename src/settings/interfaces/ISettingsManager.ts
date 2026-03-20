import type * as vscode from "vscode";
import type { ContextShieldConfig } from "../../shared/types";

export interface ISettingsManager {
  getConfig(): ContextShieldConfig;
  onConfigChange(listener: (config: ContextShieldConfig) => void): vscode.Disposable;
}
