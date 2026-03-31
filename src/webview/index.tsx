/**
 * Webview entry: mounts the root `App` component on `#root` in the VS Code settings panel HTML.
 */
import { createRoot } from "react-dom/client";
import { App } from "./App";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("ContextShield settings: missing #root");
}

createRoot(container).render(
  <App />
);
