import { execSync, spawn } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const TAILWIND_BUILD = "npx @tailwindcss/cli -i src/webview/index.css -o dist/settingsPanel.css";

const common = {
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: true,
  logLevel: "info"
};

/**
 * `vscode` is provided by the Extension Host at runtime and must never be bundled.
 * The HF / ONNX packages contain native binaries that esbuild cannot bundle, so they are also
 * excluded and are resolved from `node_modules` at runtime inside the Extension Host.
 */
const extensionExternal = [
  "vscode",
  "@huggingface/transformers",
  "onnxruntime-node",
  "onnxruntime-web",
  "sharp"
];

/**
 * Same native-binary exclusions for the worker bundle. `vscode` is not listed because the worker
 * is a plain Node process with no Extension Host — it must not import VS Code APIs.
 */
const workerExternal = ["onnxruntime-node", "onnxruntime-web", "sharp", "@huggingface/transformers"];

function copyWebviewHtml() {
  mkdirSync("dist", { recursive: true });
  copyFileSync("src/webview/index.html", "dist/settingsPanel.html");
}

const extensionCtx = await esbuild.context({
  ...common,
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  external: extensionExternal
});

const workerCtx = await esbuild.context({
  ...common,
  entryPoints: ["src/llm/llmWorkerChild.ts"],
  outfile: "dist/llmWorker.js",
  external: workerExternal
});

/** Sidebar settings webview: React bundle for browser sandbox (no `vscode` import). */
const webviewCtx = await esbuild.context({
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  sourcemap: false,
  minify: true,
  define: {
    "process.env.NODE_ENV": "\"production\""
  },
  logLevel: "info",
  entryPoints: ["src/webview/index.tsx"],
  outfile: "dist/settingsPanel.js"
});

if (watch) {
  copyWebviewHtml();
  const cssWatcher = spawn(`${TAILWIND_BUILD} --watch`, {
    stdio: "inherit",
    shell: true
  });
  const cleanup = () => {
    if (!cssWatcher.killed) {
      cssWatcher.kill("SIGTERM");
    }
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  await Promise.all([extensionCtx.watch(), workerCtx.watch(), webviewCtx.watch()]);
  console.log("[contextshield] watching extension + llmWorker + settingsPanel + tailwind...");
} else {
  execSync(TAILWIND_BUILD, { stdio: "inherit" });
  await extensionCtx.rebuild();
  await workerCtx.rebuild();
  await webviewCtx.rebuild();
  copyWebviewHtml();
  await extensionCtx.dispose();
  await workerCtx.dispose();
  await webviewCtx.dispose();
}
