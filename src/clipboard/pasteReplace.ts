import * as vscode from "vscode";
import { sleep } from "../shared/sleep";

/** Milliseconds to wait after paste before restoring the prior clipboard snapshot. */
const PASTE_SETTLE_MS = 200;

/**
 * Writes replacement text to the clipboard, pastes into the focused control (replacing the
 * current selection), then restores a prior clipboard snapshot.
 *
 * @param text - Content to paste (typically scrubbed text).
 * @param previousClipboard - Clipboard snapshot to restore after paste (best-effort).
 *
 * @remarks
 * Restoration runs in a `finally` block so the prior clipboard is restored even if paste fails.
 * Restore failures are swallowed so the original error (if any) from paste remains meaningful.
 */
export async function pasteReplaceSelectionAndRestoreClipboard(
  text: string,
  previousClipboard: string
): Promise<void> {
  try {
    await vscode.env.clipboard.writeText(text);
    await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
    await sleep(PASTE_SETTLE_MS);
  } finally {
    try {
      await vscode.env.clipboard.writeText(previousClipboard);
    } catch {
      // Best-effort restore; do not mask the error from the try block.
    }
  }
}
