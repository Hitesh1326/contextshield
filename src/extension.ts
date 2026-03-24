import * as vscode from "vscode";
import { registerEnhancePromptCommand } from "./commands/enhancePromptCommand";
import { AuditLogger } from "./logger/AuditLogger";
import { SettingsManager } from "./settings/SettingsManager";
import { COMMANDS, OUTPUT_CHANNEL_NAME } from "./shared/constants";
import type { ContextShieldConfig } from "./shared/types";
import { StatusBarController } from "./ui/StatusBarController";

/** Tooltip when the status item is idle and the extension is enabled. */
const IDLE_TOOLTIP = "Click to open ContextShield output";

/** Delay (ms) before resetting the status bar to idle after a completed or failed run. */
const IDLE_RESET_MS = 2500;

/**
 * Extension entry point: wires output logging, settings, status bar, and commands.
 *
 * @param context - VS Code extension context for registering disposables.
 */
export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const logger = new AuditLogger(outputChannel);
  const settingsManager = new SettingsManager();
  const statusBar = new StatusBarController(COMMANDS.showOutput);
  let idleResetTimer: ReturnType<typeof setTimeout> | undefined;

  const logIfEnabled = (entry: Parameters<AuditLogger["log"]>[0]): void => {
    if (settingsManager.getConfig().logToOutputChannel) {
      logger.log(entry);
    }
  };

  const applyStatus = (config: ContextShieldConfig): void => {
    if (!config.enabled) {
      statusBar.update("error", "ContextShield is disabled — enable in settings");
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
  logIfEnabled({
    level: "info",
    message: "ContextShield activated.",
    context: initialConfig
  });
  applyStatus(initialConfig);

  const showOutputCmd = vscode.commands.registerCommand(COMMANDS.showOutput, () => {
    logger.show();
  });

  const enhancePromptCmd = registerEnhancePromptCommand({
    settingsManager,
    statusBar,
    logIfEnabled,
    resetToIdle
  });

  const configSub = settingsManager.onConfigChange((config) => {
    if (config.logToOutputChannel) {
      logger.log({
        level: "info",
        message: "Settings updated.",
        context: config
      });
    }
    applyStatus(config);
  });

  context.subscriptions.push(
    outputChannel,
    {
      dispose: () => {
        if (idleResetTimer !== undefined) {
          clearTimeout(idleResetTimer);
        }
        statusBar.dispose();
      }
    },
    showOutputCmd,
    enhancePromptCmd,
    configSub
  );
}

/**
 * Called when the extension is deactivated; currently a no-op because disposables are
 * owned by `context.subscriptions`.
 */
export function deactivate(): void {}
