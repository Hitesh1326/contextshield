import { useCallback, useLayoutEffect, useRef } from "react";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../types";

/**
 * Bridges `postMessage` / `window` message events between the webview bundle and the extension host.
 *
 * The listener is attached synchronously (before React's first paint) so no `state` message sent
 * immediately after the webview posts `ready` is lost to a render-cycle race.
 *
 * @param onMessage - Handler for messages deserialized from `event.data` (extension → webview).
 */
export function useVsCode(onMessage: (msg: ExtensionToWebviewMessage) => void): {
  post: (msg: WebviewToExtensionMessage) => void;
} {
  const apiRef = useRef<ReturnType<typeof acquireVsCodeApi> | null>(null);
  if (apiRef.current === null) {
    apiRef.current = acquireVsCodeApi();
  }

  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useLayoutEffect(() => {
    const listener = (event: MessageEvent): void => {
      handlerRef.current(event.data as ExtensionToWebviewMessage);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const post = useCallback((msg: WebviewToExtensionMessage) => {
    apiRef.current?.postMessage(msg);
  }, []);

  return { post };
}
