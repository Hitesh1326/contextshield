import * as vscode from "vscode";
import type { ModelManager } from "../llm/ModelManager";
import type { SettingsManager } from "../settings/SettingsManager";
import { WEBVIEW_ALLOWED_COMMANDS, WEBVIEW_ALLOWED_SETTING_KEYS } from "../shared/constants";
import { DEFAULT_SYSTEM_PROMPT } from "../shared/systemPrompts";
import type {
  ExtensionToWebviewMessage,
  WebviewModelStatus,
  WebviewToExtensionMessage
} from "../shared/webviewProtocol";

/**
 * Routes webview messages to workspace updates and model loading. Keeps `SettingsPanelProvider`
 * free of business logic (single responsibility).
 */
export class SettingsBridge {
  private modelStatus: WebviewModelStatus;

  constructor(
    private readonly settingsManager: SettingsManager,
    private readonly modelManager: ModelManager,
    private readonly postToWebview: (msg: ExtensionToWebviewMessage) => void
  ) {
    this.modelStatus = modelManager.isReady() ? "ready" : "unknown";
  }

  public handleMessage(msg: WebviewToExtensionMessage): void {
    switch (msg.type) {
      case "ready":
        this.pushState();
        break;
      case "downloadModel":
        void this.downloadModel();
        break;
      case "deleteModelCache":
        void this.deleteModelCache();
        break;
      case "saveSetting":
        void this.saveSetting(msg.key, msg.value);
        break;
      case "runCommand":
        if (WEBVIEW_ALLOWED_COMMANDS.has(msg.command)) {
          void vscode.commands.executeCommand(msg.command, ...(msg.args ?? []));
        }
        break;
    }
  }

  /** Pushes full snapshot to the webview (config + model line). */
  public pushState(): void {
    const config = this.settingsManager.getConfig();
    const effectiveModelStatus: WebviewModelStatus = this.modelManager.isReady() ? "ready" : this.modelStatus;

    this.postToWebview({
      type: "state",
      config: {
        enabled: config.enabled,
        llmEnabled: config.llmEnabled,
        llmModel: config.llmModel,
        llmSystemPrompt: config.llmSystemPrompt,
        llmMaxNewTokens: config.llmMaxNewTokens,
        scrubbingPii: config.scrubbingPii,
        scrubbingSecrets: config.scrubbingSecrets,
        scrubbingEntropyThreshold: config.scrubbingEntropyThreshold,
        scrubbingCustomPatterns: [...config.scrubbingCustomPatterns],
        logToOutputChannel: config.logToOutputChannel
      },
      modelStatus: effectiveModelStatus,
      defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT
    });
  }

  /** Updates model status line without reloading full config. */
  public setModelStatus(status: WebviewModelStatus, detail?: string): void {
    this.modelStatus = status;
    this.postToWebview({ type: "modelStatus", status, detail });
  }

  private async downloadModel(): Promise<void> {
    this.setModelStatus("downloading", "Downloading and initializing model");
    try {
      await this.modelManager.load();
      this.setModelStatus(
        this.modelManager.isReady() ? "ready" : "error",
        this.modelManager.isReady() ? undefined : "Model failed to load"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.setModelStatus("error", msg);
    }
  }

  private async deleteModelCache(): Promise<void> {
    if (this.modelStatus === "downloading") {
      return;
    }
    const confirm = await vscode.window.showWarningMessage(
      "Delete local model cache? Downloaded model files will be removed and must be downloaded again.",
      { modal: true },
      "Delete"
    );
    if (confirm !== "Delete") {
      return;
    }
    this.setModelStatus("downloading", "Deleting local model cache");
    try {
      await this.modelManager.clearCache();
      this.setModelStatus("unknown", "Local model cache deleted");
      void vscode.window.showInformationMessage("ContextShield: local model cache deleted.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.setModelStatus("error", msg);
      void vscode.window.showErrorMessage(`ContextShield: failed to delete model cache (${msg}).`);
    }
  }

  private async saveSetting(key: string, value: unknown): Promise<void> {
    if (!WEBVIEW_ALLOWED_SETTING_KEYS.has(key)) {
      return;
    }
    const cfg = vscode.workspace.getConfiguration();
    await cfg.update(key, value, vscode.ConfigurationTarget.Global);
    this.pushState();
  }
}
