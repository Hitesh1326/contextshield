import * as vscode from "vscode";
import { sleep } from "../shared/sleep";

/** Milliseconds to wait after `clipboardCopyAction` before reading the clipboard. */
const COPY_SETTLE_MS = 80;

/** A sentinel value written to the clipboard before copying so we can detect "no selection". */
const SENTINEL = "\x00__contextshield_sentinel__\x00";

/** Result of attempting to capture the focused control's current selection. */
export type CaptureSelectionResult =
  | { ok: true; text: string; previousClipboard: string }
  | { ok: false; previousClipboard: string };

/**
 * Reads the user's current selection from whichever control is focused (editor, AI input box, etc.)
 * by writing a sentinel value to the clipboard, running `editor.action.clipboardCopyAction`, then
 * checking whether the clipboard changed from the sentinel.
 *
 * Returns `{ ok: false }` when nothing was selected (clipboard still holds the sentinel after copy).
 * The previous clipboard contents are always restored on failure or success.
 */
export async function captureSelectionViaCopy(): Promise<CaptureSelectionResult> {
  const previousClipboard = await vscode.env.clipboard.readText();
  await vscode.env.clipboard.writeText(SENTINEL);
  await vscode.commands.executeCommand("editor.action.clipboardCopyAction");
  await sleep(COPY_SETTLE_MS);
  const text = await vscode.env.clipboard.readText();

  if (!text.trim() || text === SENTINEL) {
    await vscode.env.clipboard.writeText(previousClipboard);
    return { ok: false, previousClipboard };
  }

  return { ok: true, text, previousClipboard };
}
