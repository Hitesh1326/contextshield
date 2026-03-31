import { execSync, spawn, type ChildProcess } from "node:child_process";
import { rm } from "node:fs/promises";
import * as path from "node:path";
import { DEFAULT_SYSTEM_PROMPT } from "../shared/systemPrompts";
import type { LogEntry } from "../shared/types";

type OutMsg =
  | { type: "ready" }
  | { type: "result"; id: number; text: string }
  | { type: "error"; id?: number; message: string };

/** `process.env` with `--inspect*` removed from `NODE_OPTIONS` so the forked worker does not collide with the Extension Host debugger. */
function workerEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const opts = env.NODE_OPTIONS;
  if (!opts) {
    return env;
  }
  const parts = opts.split(/\s+/).filter((p) => p.length > 0 && !/^--inspect/.test(p));
  if (parts.length === 0) {
    delete env.NODE_OPTIONS;
  } else {
    env.NODE_OPTIONS = parts.join(" ");
  }
  return env;
}

let cachedNodeBinary: string | undefined;

/** Resolves a real `node` binary (VS Code’s `process.execPath` is Electron, not Node). */
function resolveNodeBinary(): string {
  if (cachedNodeBinary !== undefined) {
    return cachedNodeBinary;
  }
  const fromEnv = process.env.CONTEXTSHIELD_NODE_BINARY;
  if (fromEnv) {
    cachedNodeBinary = fromEnv;
    return fromEnv;
  }
  try {
    if (process.platform === "win32") {
      const lines = execSync("where node", { encoding: "utf8" }).trim().split(/\r?\n/);
      cachedNodeBinary = lines[0]?.trim() || "node";
    } else {
      cachedNodeBinary = execSync("command -v node", { encoding: "utf8" }).trim();
    }
  } catch {
    cachedNodeBinary = "node";
  }
  return cachedNodeBinary;
}

/**
 * Manages a Node child process that runs ONNX / `@huggingface/transformers`. Running inference in
 * a separate process means a native crash cannot take down the VS Code Extension Host.
 */
export class ModelManager {
  private ready = false;
  private loadedModelId: string | null = null;
  private child: ChildProcess | null = null;
  private nextId = 0;
  /** Serializes overlapping `load()` calls; failures are absorbed so the chain never dead-locks. */
  private loadChain: Promise<void> = Promise.resolve();

  /**
   * @param getModelId - Called each time a load is needed so the user can change the model without
   *   restarting the extension.
   * @param cacheDir - Directory where `@huggingface/transformers` stores downloaded model files.
   * @param log - Audit log sink; receives info/warn/error entries.
   * @param extensionRoot - Absolute path to the extension install directory; used to locate
   *   `dist/llmWorker.js` and to set the worker's `cwd` so `node_modules` resolves correctly.
   */
  constructor(
    private readonly getModelId: () => string,
    private readonly cacheDir: string,
    private readonly log: (entry: LogEntry) => void,
    private readonly extensionRoot: string
  ) {}

  /** Returns `true` once the worker has sent its `"ready"` message and the model is loaded. */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Sends `text` to the worker for LLM enhancement and returns the generated reply.
   *
   * Builds a two-turn chat (`system` + `user`) from `systemPrompt` (falls back to the built-in
   * default when empty) and `text`, then waits for the worker's response over IPC.
   *
   * @param text - Already-scrubbed prompt text to enhance.
   * @param systemPrompt - Instruction for the model. Empty string uses `DEFAULT_SYSTEM_PROMPT`.
   * @param maxNewTokens - Upper bound on generated tokens.
   * @throws {Error} if the worker is not ready, the worker process exits mid-request, or inference fails.
   */
  async enhance(text: string, systemPrompt: string, maxNewTokens: number): Promise<string> {
    if (!this.child || !this.ready) {
      throw new Error("LLM worker is not ready.");
    }
    const id = ++this.nextId;
    const child = this.child;
    const system = systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const GENERATE_TIMEOUT_MS = 120_000;
      const finish = (fn: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        child.off("message", onMessage);
        child.off("exit", onExit);
        fn();
      };
      const onExit = (): void => {
        finish(() => reject(new Error("LLM worker exited during generation.")));
      };
      const onMessage = (msg: OutMsg): void => {
        if (msg.type === "result" && msg.id === id) {
          finish(() => resolve(msg.text));
        } else if (msg.type === "error" && msg.id === id) {
          finish(() => reject(new Error(msg.message)));
        }
      };
      const timer = setTimeout(() => {
        finish(() => reject(new Error("LLM generation timed out.")));
      }, GENERATE_TIMEOUT_MS);
      child.on("message", onMessage);
      child.once("exit", onExit);
      const sent = child.send({ type: "generate", id, system, user: text, maxNewTokens });
      if (sent === false) {
        finish(() => reject(new Error("LLM worker: could not send generate message (channel closed).")));
      }
    });
  }

  /**
   * Spawns `node dist/llmWorker.js` (not Electron) and loads the model. Resolves when the same model
   * is already loaded. Concurrent callers wait on a single serialized chain. Rejects if load fails.
   */
  async load(): Promise<void> {
    const modelId = this.getModelId();
    if (this.ready && this.loadedModelId === modelId) {
      return;
    }

    const attempt = this.loadChain.then(() => this.performLoad(modelId));
    this.loadChain = attempt.catch(() => {
      /* keep chain alive for the next attempt */
    });
    return attempt;
  }

  private async performLoad(modelId: string): Promise<void> {
    if (this.ready && this.loadedModelId === modelId) {
      return;
    }

    const t0 = Date.now();
    try {
      this.stopChild();
      this.log({
        level: "info",
        message:
          "Starting LLM worker (first run may download the model from Hugging Face; this can take many minutes with no further log lines until load finishes).",
        context: { modelId }
      });

      const workerPath = path.join(this.extensionRoot, "dist", "llmWorker.js");
      const nodeBinary = resolveNodeBinary();
      const child = spawn(nodeBinary, [workerPath], {
        cwd: this.extensionRoot,
        env: workerEnv(),
        stdio: ["ignore", "ignore", "pipe", "ipc"],
        windowsHide: true
      });
      this.child = child;

      if (typeof child.send !== "function") {
        throw new Error("LLM worker: IPC is not available (stdio ipc missing).");
      }

      child.stderr?.on("data", (chunk: Buffer) => {
        this.log({ level: "info", message: "LLM worker stderr.", context: { chunk: chunk.toString().slice(0, 500) } });
      });

      child.on("exit", (code, signal) => {
        this.ready = false;
        this.loadedModelId = null;
        if (this.child === child) {
          this.child = null;
        }
        this.log({ level: "warn", message: "LLM worker exited.", context: { code, signal } });
      });

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let onSpawnError: (err: Error) => void;
        const finish = (fn: () => void): void => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          clearInterval(heartbeat);
          child.off("message", onMessage);
          child.off("exit", onExit);
          child.off("error", onSpawnError);
          fn();
        };

        const LOAD_TIMEOUT_MS = 3_600_000;
        const timer = setTimeout(
          () => finish(() => reject(new Error("LLM worker timed out."))),
          LOAD_TIMEOUT_MS
        );
        const heartbeat = setInterval(() => {
          if (settled) {
            return;
          }
          this.log({
            level: "info",
            message: "Still loading local model",
            context: { modelId, elapsedSec: Math.round((Date.now() - t0) / 1000) }
          });
        }, 45_000);

        onSpawnError = (err: Error): void => {
          finish(() => reject(err));
        };

        const onExit = (code: number | null, signal: NodeJS.Signals | null): void =>
          finish(() => reject(new Error(`Worker exited before ready (code=${code}, signal=${signal ?? "none"})`)));

        const onMessage = (msg: OutMsg): void => {
          if (msg.type === "ready") {
            finish(() => {
              this.ready = true;
              this.loadedModelId = modelId;
              this.log({ level: "info", message: "Local LLM ready.", context: { modelId, ms: Date.now() - t0 } });
              resolve();
            });
          } else if (msg.type === "error" && msg.id === undefined) {
            finish(() => reject(new Error(msg.message)));
          }
        };

        child.on("message", onMessage);
        child.once("exit", onExit);
        child.once("error", onSpawnError);
        const sent = child.send({ type: "load", modelId, cacheDir: this.cacheDir });
        if (sent === false) {
          finish(() => reject(new Error("LLM worker: could not send load message (channel closed).")));
        }
      });
    } catch (e) {
      this.stopChild();
      const err = e instanceof Error ? e.message : String(e);
      this.log({ level: "error", message: "Local LLM failed to load.", context: { modelId: this.getModelId(), error: err } });
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  /**
   * Kills the worker process with SIGTERM. Called from the extension's disposable so VS Code cleans
   * up the child when the window closes or the extension is disabled.
   */
  dispose(): void {
    this.stopChild();
  }

  /**
   * Deletes the local Hugging Face cache directory used by this extension.
   * The worker is stopped first so no process holds file handles while deleting.
   */
  async clearCache(): Promise<void> {
    this.stopChild();
    await rm(this.cacheDir, { recursive: true, force: true });
    this.log({ level: "info", message: "Local model cache deleted.", context: { cacheDir: this.cacheDir } });
  }

  private stopChild(): void {
    if (this.child) {
      this.child.removeAllListeners();
      this.child.kill("SIGTERM");
      this.child = null;
    }
    this.ready = false;
    this.loadedModelId = null;
  }
}
