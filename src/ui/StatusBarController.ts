import * as vscode from "vscode";
import type { PipelineState } from "../shared/types";

/**
 * Left-aligned status bar item for ContextShield pipeline feedback.
 */
export class StatusBarController {
  private readonly item: vscode.StatusBarItem;

  /**
   * @param command - Command ID executed when the status item is clicked.
   */
  constructor(command: string) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = command;
  }

  /**
   * Updates icon, label, colors, and tooltip from the pipeline state.
   *
   * @param state - Visual state (idle, scanning, done, error, etc.).
   * @param detail - Optional tooltip body; defaults to a generic status hint.
   */
  public update(state: PipelineState, detail?: string): void {
    switch (state) {
      case "idle":
        this.item.text = "$(shield) ContextShield: Ready";
        this.item.backgroundColor = undefined;
        break;
      case "scanning":
        this.item.text = "$(loading~spin) ContextShield: Scanning...";
        this.item.backgroundColor = undefined;
        break;
      case "done":
        this.item.text = "$(check) ContextShield: Done";
        this.item.backgroundColor = undefined;
        break;
      case "error":
        this.item.text = "$(error) ContextShield: Error";
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        break;
    }

    this.item.tooltip = detail ?? "ContextShield status";
    this.item.show();
  }

  /** Releases the underlying status bar item. */
  public dispose(): void {
    this.item.dispose();
  }
}
