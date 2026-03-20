import type { LogEntry } from "../../shared/types";

export interface ILogger {
  log(entry: LogEntry): void;
  show(): void;
}
