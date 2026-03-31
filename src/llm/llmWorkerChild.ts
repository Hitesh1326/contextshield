/** Worker process for local LLM load + generate (IPC with `ModelManager`). */
import type { TextGenerationPipeline } from "@huggingface/transformers";

/** Messages sent from the parent (`ModelManager`) to this worker. */
type InMsg =
  | { type: "load"; modelId: string; cacheDir: string }
  | { type: "generate"; id: number; system: string; user: string; maxNewTokens: number };

/** Messages this worker sends back to the parent. */
type OutMsg =
  | { type: "ready" }
  | { type: "result"; id: number; text: string }
  | { type: "error"; id?: number; message: string };

let pipeline: TextGenerationPipeline | null = null;
const GENERATION_DEFAULTS = {
  return_full_text: false,
  temperature: 0.1,
  do_sample: false
} as const;

/** Normalize transformers.js output into assistant text; fallback to empty string. */
function parseOutput(raw: unknown): string {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "";
  }
  const gt = (raw[0] as { generated_text?: unknown })?.generated_text;
  if (typeof gt === "string") {
    return gt;
  }
  if (Array.isArray(gt)) {
    const asst = [...gt].reverse().find((m: unknown) => {
      return typeof m === "object" && m !== null && (m as { role?: unknown }).role === "assistant";
    });
    return typeof (asst as { content?: unknown } | undefined)?.content === "string"
      ? ((asst as { content: string }).content ?? "")
      : "";
  }
  return "";
}

/** Downloads (if needed) and initializes the model pipeline, then signals the parent. */
async function handleLoad(msg: Extract<InMsg, { type: "load" }>): Promise<void> {
  const transformers: any = await import("@huggingface/transformers");
  const { env, pipeline: makePipeline } = transformers as {
    env: any;
    pipeline: (task: string, model: string, opts?: any) => Promise<TextGenerationPipeline>;
  };
  env.cacheDir = msg.cacheDir;
  const preferredDtypes = ["q4", "q8", "int8", "uint8", "fp32"];
  let chosenDtype: string = "q4";
  const ModelRegistry = transformers?.ModelRegistry;
  if (ModelRegistry && typeof ModelRegistry.get_available_dtypes === "function") {
    try {
      const available = (await ModelRegistry.get_available_dtypes(msg.modelId)) as string[];
      chosenDtype = preferredDtypes.find((d) => available.includes(d)) ?? available[0] ?? chosenDtype;
      console.error(
        `[llmWorker] available dtypes for ${msg.modelId}: ${JSON.stringify(available)}; using: ${chosenDtype}`
      );
    } catch (e) {
      console.error(
        `[llmWorker] could not probe dtypes for ${msg.modelId}; using default dtype=${chosenDtype}. Error=${e instanceof Error ? e.message : String(e)}`
      );
    }
  } else {
    console.error(`[llmWorker] ModelRegistry.get_available_dtypes not available; using default dtype=${chosenDtype}`);
  }

  console.error(
    `[llmWorker] loading pipeline (download + ONNX init can take several minutes on first run): ${msg.modelId} dtype=${chosenDtype}`
  );
  pipeline = (await makePipeline("text-generation", msg.modelId, {
    dtype: chosenDtype,
    device: "cpu"
  })) as TextGenerationPipeline;
  console.error("[llmWorker] pipeline ready; sending IPC ready");
  process.send?.({ type: "ready" } satisfies OutMsg);
}

/** Run one generation request and return normalized text over IPC. */
async function handleGenerate(msg: Extract<InMsg, { type: "generate" }>): Promise<void> {
  if (!pipeline) {
    throw new Error("Worker: model not loaded yet.");
  }
  const messages = [
    { role: "system", content: msg.system },
    { role: "user", content: msg.user }
  ];
  const out = await pipeline(messages, { ...GENERATION_DEFAULTS, max_new_tokens: msg.maxNewTokens });
  process.send?.({ type: "result", id: msg.id, text: parseOutput(out) } satisfies OutMsg);
}

/**
 * IPC (Inter-Process Communication) between this **child** worker and the **parent** process.
 *
 * - Parent: `ModelManager` in the extension host spawns this file as a separate Node process
 *   (`node dist/llmWorker.js`) so ONNX / native crashes do not take down VS Code.
 * - Messages: parent → child via Node’s `child.send()`; this file receives them with
 *   `process.on("message", ...)`. Replies go child → parent with `process.send(...)`.
 * - Types: `load` (download + init pipeline), `generate` (run inference), plus `error` replies.
 */
process.on("message", (msg: InMsg) => {
  void (async () => {
    try {
      if (msg.type === "load") {
        await handleLoad(msg);
      } else if (msg.type === "generate") {
        await handleGenerate(msg);
      }
    } catch (e) {
      const message = e instanceof Error ? e.stack ?? e.message : String(e);
      const id = msg.type === "generate" ? msg.id : undefined;
      process.send?.({ type: "error", id, message } satisfies OutMsg);
    }
  })();
});
