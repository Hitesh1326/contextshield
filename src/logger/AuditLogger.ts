import * as vscode from "vscode";
import type { ILogger } from "./interfaces/ILogger";
import type { LogEntry } from "../shared/types";

/**
 * Writes timestamped structured lines to a VS Code `OutputChannel`.
 */
export class AuditLogger implements ILogger {
  /**
   * @param channel - Output channel instance (typically named `ContextShield`).
   */
  constructor(private readonly channel: vscode.OutputChannel) {}

  /**
   * Appends one log line with ISO timestamp and optional JSON context.
   *
   * @param entry - Log level, message, and optional structured context.
   */
  public log(entry: LogEntry): void {
    const ts = new Date().toISOString();
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    this.channel.appendLine(`[${ts}] [${entry.level.toUpperCase()}] ${entry.message}${context}`);
  }

  /**
   * Reveals the output channel in the UI (preserve focus).
   */
  public show(): void {
    this.channel.show(true);
  }
}
