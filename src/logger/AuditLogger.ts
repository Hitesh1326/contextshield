import * as vscode from "vscode";
import type { ILogger } from "./interfaces/ILogger";
import type { LogEntry } from "../shared/types";

export class AuditLogger implements ILogger {
  constructor(private readonly channel: vscode.OutputChannel) {}

  public log(entry: LogEntry): void {
    const ts = new Date().toISOString();
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    this.channel.appendLine(`[${ts}] [${entry.level.toUpperCase()}] ${entry.message}${context}`);
  }

  public show(): void {
    this.channel.show(true);
  }
}
