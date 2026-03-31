import path from "node:path";
import * as vscode from "vscode";
import { AuditLogger } from "./logger/AuditLogger";
import { ModelManager } from "./llm/ModelManager";
import { SettingsManager } from "./settings/SettingsManager";
import { COMMANDS, OUTPUT_CHANNEL_NAME, SETTINGS_VIEW_ID } from "./shared/constants";
import type { ContextShieldConfig } from "./shared/types";
import { StatusBarController } from "./extensionHost/StatusBarController";
import { SettingsPanelProvider } from "./extensionHost/SettingsPanelProvider";

const IDLE_TOOLTIP = "Click to open ContextShield output";
const IDLE_RESET_MS = 2500;

/**
 * VS Code extension entry point. Wires up the output channel, settings, status bar, LLM worker,
 * and sidebar webview. The local model loads lazily from the sidebar or when settings change.
 */
export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const logger = new AuditLogger(outputChannel);
  const settingsManager = new SettingsManager();

  const logIfEnabled = (entry: Parameters<AuditLogger["log"]>[0]): void => {
    if (settingsManager.getConfig().logToOutputChannel) {
      logger.log(entry);
    }
  };

  const modelManager = new ModelManager(
    () => settingsManager.getConfig().llmModel,
    path.join(context.globalStorageUri.fsPath, "hf-cache"),
    logIfEnabled,
    context.extensionPath
  );

  const settingsPanel = new SettingsPanelProvider(
    context.extensionUri,
    settingsManager,
    modelManager
  );

  const settingsPanelReg = vscode.window.registerWebviewViewProvider(
    SETTINGS_VIEW_ID,
    settingsPanel,
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  const statusBar = new StatusBarController(COMMANDS.showOutput);
  let idleResetTimer: ReturnType<typeof setTimeout> | undefined;

  const applyStatus = (config: ContextShieldConfig): void => {
    if (!config.enabled) {
      statusBar.update("disabled", "ContextShield is disabled — enable in settings");
    } else {
      statusBar.update("idle", IDLE_TOOLTIP);
    }
  };

  const resetToIdle = (): void => {
    if (idleResetTimer !== undefined) {
      clearTimeout(idleResetTimer);
    }
    idleResetTimer = setTimeout(() => {
      idleResetTimer = undefined;
      applyStatus(settingsManager.getConfig());
    }, IDLE_RESET_MS);
  };

  const initialConfig = settingsManager.getConfig();
  logIfEnabled({ level: "info", message: "ContextShield activated.", context: initialConfig });
  applyStatus(initialConfig);

  const showOutputCmd = vscode.commands.registerCommand(COMMANDS.showOutput, () => logger.show());

  const openSettingsCmd = vscode.commands.registerCommand(COMMANDS.openSettings, () => {
    void vscode.commands.executeCommand("workbench.action.openSettings", "contextshield");
  });

  const openSidebarCmd = vscode.commands.registerCommand(COMMANDS.openSidebar, () => {
    void vscode.commands.executeCommand("workbench.view.extension.contextshield-sidebar");
  });

  const enhancePromptCmd = vscode.commands.registerCommand(COMMANDS.enhancePrompt, async () => {
    const { runEnhancePrompt } = await import("./commands/enhancePromptCommand.js");
    await runEnhancePrompt({
      settingsManager,
      statusBar,
      logIfEnabled,
      resetToIdle,
      modelManager
    });
  });

  const configSub = settingsManager.onConfigChange((config) => {
    logIfEnabled({ level: "info", message: "Settings updated.", context: config });
    applyStatus(config);
  });

  const llmConfigSub = vscode.workspace.onDidChangeConfiguration((e) => {
    if (
      e.affectsConfiguration("contextshield.llm.model") &&
      settingsManager.getConfig().llmEnabled
    ) {
      void modelManager.load().catch((err) => {
        logIfEnabled({
          level: "warn",
          message: "Model reload after settings change failed.",
          context: { error: err instanceof Error ? err.message : String(err) }
        });
      });
    }
  });

  context.subscriptions.push(
    outputChannel,
    {
      dispose: () => {
        if (idleResetTimer !== undefined) {
          clearTimeout(idleResetTimer);
        }
        modelManager.dispose();
        statusBar.dispose();
      }
    },
    showOutputCmd,
    openSettingsCmd,
    openSidebarCmd,
    enhancePromptCmd,
    settingsPanelReg,
    configSub,
    llmConfigSub
  );
}

/** Called by VS Code when the extension is unloaded; worker cleanup happens via `dispose()`. */
export function deactivate(): void {}
