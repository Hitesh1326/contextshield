import * as vscode from "vscode";
import type { ISettingsManager } from "./interfaces/ISettingsManager";
import type { ContextShieldConfig } from "../shared/types";
import { SETTINGS } from "../shared/constants";

export class SettingsManager implements ISettingsManager {
  public getConfig(): ContextShieldConfig {
    const cfg = vscode.workspace.getConfiguration();
    return {
      enabled: cfg.get<boolean>(SETTINGS.enabled, true),
      proxyPort: cfg.get<number>(SETTINGS.proxyPort, 7080),
      additionalDomains: cfg.get<string[]>(SETTINGS.additionalDomains, []),
      detectSecrets: cfg.get<boolean>(SETTINGS.detectSecrets, true),
      detectPii: cfg.get<boolean>(SETTINGS.detectPii, true),
      enhancedPii: cfg.get<boolean>(SETTINGS.enhancedPii, true),
      customPatterns: cfg.get<string[]>(SETTINGS.customPatterns, []),
      blockedPaths: cfg.get<string[]>(SETTINGS.blockedPaths, []),
      logToOutputChannel: cfg.get<boolean>(SETTINGS.logToOutputChannel, true)
    };
  }

  public onConfigChange(listener: (config: ContextShieldConfig) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("contextshield")) {
        listener(this.getConfig());
      }
    });
  }
}
