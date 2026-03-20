import * as vscode from "vscode";
import type { ShieldState } from "../shared/types";

export class StatusBarController {
  private readonly item: vscode.StatusBarItem;

  constructor(command: string) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = command;
  }

  public update(state: ShieldState, detail?: string): void {
    switch (state) {
      case "idle":
        this.item.text = "$(shield) ContextShield: Idle";
        this.item.backgroundColor = undefined;
        break;
      case "running":
        this.item.text = "$(shield) ContextShield: Running";
        this.item.backgroundColor = undefined;
        break;
      case "warning":
        this.item.text = "$(warning) ContextShield: Alert";
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        break;
      case "error":
        this.item.text = "$(error) ContextShield: Error";
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        break;
    }

    this.item.tooltip = detail ?? "ContextShield status";
    this.item.show();
  }

  public dispose(): void {
    this.item.dispose();
  }
}
