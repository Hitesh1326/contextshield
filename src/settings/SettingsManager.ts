import * as vscode from "vscode";
import type { ISettingsManager } from "./interfaces/ISettingsManager";
import type { ContextShieldConfig } from "../shared/types";
import { SETTINGS } from "../shared/constants";

/**
 * Reads `contextshield.*` settings from the VS Code workspace configuration API.
 */
export class SettingsManager implements ISettingsManager {
  private readonly defaultModel = "onnx-community/Llama-3.2-3B-Instruct-ONNX";

  /**
   * @returns Resolved configuration with defaults applied for missing keys.
   */
  public getConfig(): ContextShieldConfig {
    const cfg = vscode.workspace.getConfiguration();

    return {
      enabled: cfg.get<boolean>(SETTINGS.enabled, true),
      scrubbingPii: cfg.get<boolean>(SETTINGS.scrubbingPii, true),
      scrubbingSecrets: cfg.get<boolean>(SETTINGS.scrubbingSecrets, true),
      scrubbingEntropyThreshold: cfg.get<number>(SETTINGS.scrubbingEntropyThreshold, 4.5),
      scrubbingCustomPatterns: cfg.get<string[]>(SETTINGS.scrubbingCustomPatterns, []),
      llmEnabled: cfg.get<boolean>(SETTINGS.llmEnabled, true),
      llmModel: cfg.get<string>(SETTINGS.llmModel, this.defaultModel),
      llmSystemPrompt: cfg.get<string>(SETTINGS.llmSystemPrompt, ""),
      llmMaxNewTokens: cfg.get<number>(SETTINGS.llmMaxNewTokens, 1024),
      logToOutputChannel: cfg.get<boolean>(SETTINGS.logToOutputChannel, true)
    };
  }

  /**
   * Subscribes to changes affecting any `contextshield` setting.
   *
   * @param listener - Called with the latest config after a relevant change.
   * @returns A disposable that unsubscribes when disposed.
   */
  public onConfigChange(listener: (config: ContextShieldConfig) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("contextshield")) {
        listener(this.getConfig());
      }
    });
  }
}
