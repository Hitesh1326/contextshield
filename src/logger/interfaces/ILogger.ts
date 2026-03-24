import type { LogEntry } from "../../shared/types";

/** Minimal logging surface for audit output. */
export interface ILogger {
  /** Append a structured log entry. */
  log(entry: LogEntry): void;
  /** Show the underlying output channel in the UI. */
  show(): void;
}
