import * as vscode from "vscode";
import type { AuditLogger } from "../logger/AuditLogger";
import { scrubText } from "../scrub";
import { captureSelectionViaCopy } from "../clipboard/clipboardSelection";
import { pasteReplaceSelectionAndRestoreClipboard } from "../clipboard/pasteReplace";
import type { SettingsManager } from "../settings/SettingsManager";
import { COMMANDS } from "../shared/constants";
import type { StatusBarController } from "../ui/StatusBarController";

const MSG_DISABLED = "ContextShield is disabled in settings.";
const MSG_NOTHING_SELECTED =
  "Nothing selected to scrub. Select text in the input box, then run ContextShield again.";
const msgReplaced = (n: number): string =>
  `ContextShield: replaced text — ${n} finding(s) scrubbed.`;

/**
 * Dependencies injected from the extension activation (composition root).
 */
export type EnhancePromptDeps = {
  /** Workspace/user settings reader. */
  settingsManager: SettingsManager;
  /** Status bar UI for pipeline feedback. */
  statusBar: StatusBarController;
  /** Logs only when `contextshield.audit.logToOutputChannel` is enabled. */
  logIfEnabled: (entry: Parameters<AuditLogger["log"]>[0]) => void;
  /** Returns the status bar to idle after a short delay. */
  resetToIdle: () => void;
};

/**
 * Runs the Enhance Prompt flow: capture selection → scrub PII/secrets → paste replacement.
 *
 * @param deps - Injected services and callbacks from {@link registerEnhancePromptCommand}.
 */
export async function runEnhancePrompt(deps: EnhancePromptDeps): Promise<void> {
  const { settingsManager, statusBar, logIfEnabled, resetToIdle } = deps;
  const config = settingsManager.getConfig();

  if (!config.enabled) {
    await vscode.window.showWarningMessage(MSG_DISABLED);
    return;
  }

  const captured = await captureSelectionViaCopy();
  if (!captured.ok) {
    await vscode.window.showInformationMessage(MSG_NOTHING_SELECTED);
    return;
  }

  const { text: raw, previousClipboard } = captured;

  statusBar.update("scanning", "Scrubbing…");

  try {
    const scrubbed = scrubText(raw, config);

    if (scrubbed.invalidPatterns.length > 0) {
      logIfEnabled({
        level: "warn",
        message: "Ignored invalid custom regex pattern(s).",
        context: { invalidPatterns: scrubbed.invalidPatterns }
      });
    }

    await pasteReplaceSelectionAndRestoreClipboard(scrubbed.text, previousClipboard);

    const n = scrubbed.entities.length;
    statusBar.update("done", `Scrubbed ${n} finding(s)`);

    logIfEnabled({
      level: "info",
      message: "enhancePrompt scrub complete.",
      context: {
        entityCount: n,
        kinds: [...new Set(scrubbed.entities.map((e) => e.kind))]
      }
    });

    void vscode.window.showInformationMessage(msgReplaced(n));
    resetToIdle();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    statusBar.update("error", msg);
    logIfEnabled({
      level: "error",
      message: "enhancePrompt failed.",
      context: { error: msg }
    });
    resetToIdle();
  }
}

/**
 * Registers the `contextshield.enhancePrompt` command.
 *
 * @param deps - Services and callbacks required by {@link runEnhancePrompt}.
 * @returns A disposable that unregisters the command when disposed.
 */
export function registerEnhancePromptCommand(deps: EnhancePromptDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.enhancePrompt, () => runEnhancePrompt(deps));
}
