import * as vscode from "vscode";
import { AuditLogger } from "./logger/AuditLogger";
import { COMMANDS, OUTPUT_CHANNEL_NAME } from "./shared/constants";
import { SettingsManager } from "./settings/SettingsManager";
import { StatusBarController } from "./ui/StatusBarController";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const logger = new AuditLogger(outputChannel);
  const settingsManager = new SettingsManager();
  const statusBar = new StatusBarController(COMMANDS.showOutput);

  context.subscriptions.push(outputChannel, statusBar);

  const showOutputCommand = vscode.commands.registerCommand(COMMANDS.showOutput, () => {
    logger.show();
  });

  const enableProxyCommand = vscode.commands.registerCommand(COMMANDS.enableProxyInterception, async () => {
    logger.log({
      level: "info",
      message: "Enable proxy interception command triggered."
    });
    await vscode.window.showInformationMessage(
      "Proxy interception is not implemented yet. It will be added in M2."
    );
  });

  const configSubscription = settingsManager.onConfigChange((config) => {
    logger.log({
      level: "info",
      message: "Settings updated.",
      context: config
    });
  });

  context.subscriptions.push(showOutputCommand, enableProxyCommand, configSubscription);

  const initialConfig = settingsManager.getConfig();
  logger.log({
    level: "info",
    message: "ContextShield activated.",
    context: initialConfig
  });

  statusBar.update(initialConfig.enabled ? "idle" : "error", "Click to open ContextShield output");
}

export function deactivate(): void {
  // No-op for M1.
}
