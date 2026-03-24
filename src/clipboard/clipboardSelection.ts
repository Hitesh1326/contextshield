import * as vscode from "vscode";
import { sleep } from "../shared/sleep";

/** Milliseconds to wait after `clipboardCopyAction` before reading the clipboard. */
const COPY_SETTLE_MS = 80;

/**
 * Result of attempting to copy the current selection from the focused control.
 *
 * @remarks
 * Uses `editor.action.clipboardCopyAction`, which requires a non-empty selection in the
 * focused editor or input. If the copy yields empty text, the prior clipboard is restored.
 */
export type CaptureSelectionResult =
  | { ok: true; text: string; previousClipboard: string }
  | { ok: false; previousClipboard: string };

/**
 * Copies the focused control’s current selection into the system clipboard and returns that text.
 *
 * @returns When copy succeeds: `{ ok: true, text, previousClipboard }`.
 * When nothing was selected (empty copy): `{ ok: false, previousClipboard }` and the clipboard is restored.
 */
export async function captureSelectionViaCopy(): Promise<CaptureSelectionResult> {
  const previousClipboard = await vscode.env.clipboard.readText();
  await vscode.commands.executeCommand("editor.action.clipboardCopyAction");
  await sleep(COPY_SETTLE_MS);
  const text = await vscode.env.clipboard.readText();

  if (!text.trim()) {
    await vscode.env.clipboard.writeText(previousClipboard);
    return { ok: false, previousClipboard };
  }

  return { ok: true, text, previousClipboard };
}
