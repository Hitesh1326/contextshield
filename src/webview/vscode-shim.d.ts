/**
 * VS Code injects this global in webviews before our bundle runs.
 */
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
};
