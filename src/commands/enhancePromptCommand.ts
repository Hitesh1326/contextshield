import * as vscode from "vscode";
import type { AuditLogger } from "../logger/AuditLogger";
import type { ModelManager } from "../llm/ModelManager";
import { scrubText } from "../scrub";
import { captureSelectionViaCopy } from "../clipboard/clipboardSelection";
import { pasteReplaceSelectionAndRestoreClipboard } from "../clipboard/pasteReplace";
import type { SettingsManager } from "../settings/SettingsManager";
import type { StatusBarController } from "../extensionHost/StatusBarController";

const MSG_DISABLED = "ContextShield is disabled. Enable it in settings to continue.";
const MSG_NOTHING_SELECTED = "Select text first, then run the command again.";
const MSG_WORKFLOW_TITLE = "Checking content";

const msgSuccess = (n: number, didEnhance: boolean): string =>
  didEnhance
    ? `${n} sensitive items redacted and enhanced`
    : `${n} sensitive items redacted`;

/** Dependencies injected from `activate`. */
export type EnhancePromptDeps = {
  /** Reads the current `contextshield.*` configuration. */
  settingsManager: SettingsManager;
  /** Updated during each stage of the command (scanning → enhancing → done / error). */
  statusBar: StatusBarController;
  /** Writes to the output channel only when `contextshield.audit.logToOutputChannel` is on. */
  logIfEnabled: (entry: Parameters<AuditLogger["log"]>[0]) => void;
  /** Schedules a return to the idle status bar state after a short delay. */
  resetToIdle: () => void;
  /**
   * Worker-process LLM used for the optional enhance step. Omit (or leave `undefined`) to run in
   * scrub-only mode regardless of the `contextshield.llm.enabled` setting.
   */
  modelManager?: ModelManager;
};

type LogIfEnabled = EnhancePromptDeps["logIfEnabled"];

type PipelineRunResult = {
  scrubbed: ReturnType<typeof scrubText>;
  didEnhance: boolean;
};
type CaptureOk = Extract<Awaited<ReturnType<typeof captureSelectionViaCopy>>, { ok: true }>;

async function promptEnableIfDisabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    return false;
  }
  await vscode.window.showWarningMessage(MSG_DISABLED, "Open Settings").then((selection) => {
    if (selection === "Open Settings") {
      void vscode.commands.executeCommand("workbench.action.openSettings", "contextshield.enabled");
    }
  });
  return true;
}

async function captureSelectionOrNotify(): Promise<CaptureOk | undefined> {
  const captured = await captureSelectionViaCopy();
  if (!captured.ok) {
    await vscode.window.showInformationMessage(MSG_NOTHING_SELECTED);
    return undefined;
  }
  return captured;
}

function logInvalidPatterns(logIfEnabled: LogIfEnabled, invalidPatterns: readonly string[]): void {
  if (invalidPatterns.length === 0) {
    return;
  }
  logIfEnabled({
    level: "warn",
    message: "Ignored invalid custom regex pattern(s).",
    context: { invalidPatterns }
  });
}

async function maybeEnhanceText(
  scrubbedText: string,
  llmSystemPrompt: string,
  llmMaxNewTokens: number,
  modelManager: ModelManager,
  statusBar: StatusBarController,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  logIfEnabled: LogIfEnabled
): Promise<{ finalText: string; didEnhance: boolean }> {
  if (!modelManager.isReady()) {
    statusBar.update("scanning", "Loading model");
    progress.report({ message: "Loading model" });
    try {
      await modelManager.load();
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      logIfEnabled({
        level: "warn",
        message: "Local model could not be loaded; pasting scrubbed text only.",
        context: { error: err }
      });
    }
  }

  if (!modelManager.isReady()) {
    return { finalText: scrubbedText, didEnhance: false };
  }

  statusBar.update("enhancing", "Enhancing");
  progress.report({ message: "Enhancing prompt" });
  const t0 = Date.now();
  try {
    const enhanced = await modelManager.enhance(scrubbedText, llmSystemPrompt, llmMaxNewTokens);
    if (enhanced.trim().length === 0) {
      logIfEnabled({ level: "warn", message: "Enhancement returned empty output; using scrubbed text." });
      return { finalText: scrubbedText, didEnhance: false };
    }
    logIfEnabled({ level: "info", message: "Enhancement complete", context: { ms: Date.now() - t0 } });
    return { finalText: enhanced, didEnhance: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    logIfEnabled({ level: "warn", message: "Enhancement unavailable, using scrubbed text", context: { error: err } });
    return { finalText: scrubbedText, didEnhance: false };
  }
}

async function runPipelineWithProgress(
  raw: string,
  previousClipboard: string,
  deps: EnhancePromptDeps,
  config: ReturnType<SettingsManager["getConfig"]>
): Promise<PipelineRunResult> {
  const { statusBar, logIfEnabled, modelManager } = deps;
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: MSG_WORKFLOW_TITLE,
      cancellable: false
    },
    async (progress) => {
      progress.report({ message: "Scanning for sensitive data" });
      const scrubbed = scrubText(raw, config);
      logInvalidPatterns(logIfEnabled, scrubbed.invalidPatterns);

      let finalText = scrubbed.text;
      let didEnhance = false;

      if (config.llmEnabled && modelManager) {
        const enhanced = await maybeEnhanceText(
          scrubbed.text,
          config.llmSystemPrompt,
          config.llmMaxNewTokens,
          modelManager,
          statusBar,
          progress,
          logIfEnabled
        );
        finalText = enhanced.finalText;
        didEnhance = enhanced.didEnhance;
      }

      progress.report({ message: "Updating selection" });
      await pasteReplaceSelectionAndRestoreClipboard(finalText, previousClipboard);
      return { scrubbed, didEnhance };
    }
  );
}

function handleSuccess(result: PipelineRunResult, statusBar: StatusBarController, logIfEnabled: LogIfEnabled, resetToIdle: () => void): void {
  const n = result.scrubbed.entities.length;
  statusBar.update("done", result.didEnhance ? `${n} items redacted · enhanced` : `${n} items redacted`);
  logIfEnabled({
    level: "info",
    message: "Complete",
    context: { itemCount: n, types: [...new Set(result.scrubbed.entities.map((e) => e.kind))], enhanced: result.didEnhance }
  });
  void vscode.window.showInformationMessage(msgSuccess(n, result.didEnhance));
  resetToIdle();
}

function handleFailure(
  error: unknown,
  statusBar: StatusBarController,
  logIfEnabled: LogIfEnabled,
  resetToIdle: () => void
): void {
  const msg = error instanceof Error ? error.message : String(error);
  statusBar.update("error", "Failed");
  logIfEnabled({ level: "error", message: "Failed", context: { error: msg } });
  void vscode.window.showErrorMessage("Something went wrong. Check the ContextShield output for details.");
  resetToIdle();
}

/**
 * Main pipeline (capture → scrub → optional enhance → paste). Registered as `contextshield.enhancePrompt`
 * in `extension.ts` (omitted from `contributes.commands` so it does not appear in the Command Palette).
 *
 * Flow:
 * 1. Captures the selected text via a synthetic copy.
 * 2. Scrubs PII / secrets, replacing them with typed placeholders (`[EMAIL]`, `[SECRET]`, …).
 * 3. If LLM is enabled and the worker is ready, rewrites the scrubbed prompt locally.
 * 4. Pastes the result back and restores the previous clipboard contents.
 *
 * @param deps - Services injected by the extension's `activate` function.
 */
export async function runEnhancePrompt(deps: EnhancePromptDeps): Promise<void> {
  const { settingsManager, statusBar, logIfEnabled, resetToIdle, modelManager } = deps;
  const config = settingsManager.getConfig();

  if (await promptEnableIfDisabled(config.enabled)) {
    return;
  }

  const captured = await captureSelectionOrNotify();
  if (!captured) {
    return;
  }

  const { text: raw, previousClipboard } = captured;
  statusBar.update("scanning", "Scanning");

  try {
    const result = await runPipelineWithProgress(raw, previousClipboard, deps, config);
    handleSuccess(result, statusBar, logIfEnabled, resetToIdle);
  } catch (e) {
    handleFailure(e, statusBar, logIfEnabled, resetToIdle);
  }
}
