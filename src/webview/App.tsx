import { useCallback, useEffect, useState, type ReactElement } from "react";
import { SETTINGS } from "../shared/constants";
import type { ExtensionToWebviewMessage, WebviewConfigSnapshot, WebviewModelStatus } from "./types";
import { useVsCode } from "./hooks/useVsCode";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { GeneralSection } from "./components/GeneralSection";
import { ModelSection } from "./components/ModelSection";
import { EnhancementSection } from "./components/EnhancementSection";
import { ScrubbingSection } from "./components/ScrubbingSection";
import { OutputSection } from "./components/OutputSection";
import { ShortcutSection } from "./components/ShortcutSection";

/** Config + default prompt snapshot from the extension (`state` message). */
type UiState = {
  config: WebviewConfigSnapshot;
  defaultSystemPrompt: string;
};

function customPatternsToDraft(patterns: readonly string[]): string {
  return patterns.join("\n");
}

function draftToCustomPatterns(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Settings sidebar root: receives `state` / `modelStatus` from the extension, posts `ready` on
 * mount, and wires section controls to `saveSetting`, `downloadModel`, and `runCommand` messages.
 */
export function App(): ReactElement {
  const [ui, setUi] = useState<UiState | null>(null);
  const [modelStatus, setModelStatus] = useState<WebviewModelStatus>("unknown");
  const [modelStatusDetail, setModelStatusDetail] = useState<string | undefined>(undefined);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [customPatternsDraft, setCustomPatternsDraft] = useState("");

  const handleExtensionMessage = useCallback((msg: ExtensionToWebviewMessage) => {
    if (msg.type === "state") {
      setUi({ config: msg.config, defaultSystemPrompt: msg.defaultSystemPrompt });
      setModelStatus(msg.modelStatus);
      setModelStatusDetail(undefined);
      setSystemPromptDraft(msg.config.llmSystemPrompt);
      setCustomPatternsDraft(customPatternsToDraft(msg.config.scrubbingCustomPatterns));
    } else if (msg.type === "modelStatus") {
      setModelStatus(msg.status);
      setModelStatusDetail(msg.detail);
    }
  }, []);

  const { post } = useVsCode(handleExtensionMessage);

  const runCommand = useCallback(
    (command: string, args?: unknown[]) => {
      post({ type: "runCommand", command, args });
    },
    [post]
  );

  useEffect(() => {
    post({ type: "ready" });
  }, [post]);

  useEffect(() => {
    if (ui !== null) {
      return;
    }
    // Retry the ready handshake while loading so a dropped first message does not leave the panel stuck.
    const retryTimer = setInterval(() => {
      post({ type: "ready" });
    }, 1200);
    return () => {
      clearInterval(retryTimer);
    };
  }, [ui, post]);

  const defaultPreview =
    ui === null
      ? ""
      : ui.defaultSystemPrompt.length > 80
        ? `${ui.defaultSystemPrompt.slice(0, 80)}…`
        : ui.defaultSystemPrompt;

  if (ui === null) {
    return (
      <p className="hint" role="status" aria-busy="true">
        Loading ContextShield settings...
      </p>
    );
  }

  const { config } = ui;

  return (
    <>
      <CollapsibleSection title="General" defaultOpen>
        <GeneralSection
          enabled={config.enabled}
          onEnabledChange={(value) => {
            post({ type: "saveSetting", key: SETTINGS.enabled, value });
          }}
          onRunCommand={runCommand}
        />
      </CollapsibleSection>

      <div className={config.enabled ? undefined : "cs-disabled-block"} inert={config.enabled ? undefined : true}>
        <hr className="cs-hr" />

        <CollapsibleSection title="Local model" defaultOpen>
          <ModelSection
            modelId={config.llmModel}
            modelStatus={modelStatus}
            statusDetail={modelStatusDetail}
            onDownload={() => {
              post({ type: "downloadModel" });
            }}
            onDeleteCache={() => {
              post({ type: "deleteModelCache" });
            }}
          />
        </CollapsibleSection>

        <hr className="cs-hr" />

        <CollapsibleSection title="Enhancement" defaultOpen>
          <EnhancementSection
            llmEnabled={config.llmEnabled}
            llmSystemPrompt={systemPromptDraft}
            llmMaxNewTokens={config.llmMaxNewTokens}
            defaultSystemPromptPreview={defaultPreview}
            onLlmEnabledChange={(value) => {
              post({ type: "saveSetting", key: SETTINGS.llmEnabled, value });
            }}
            onSystemPromptChange={setSystemPromptDraft}
            onSystemPromptBlur={(value) => {
              post({ type: "saveSetting", key: SETTINGS.llmSystemPrompt, value });
            }}
            onMaxTokensChange={(value) => {
              post({ type: "saveSetting", key: SETTINGS.llmMaxNewTokens, value });
            }}
            onResetSystemPrompt={() => {
              setSystemPromptDraft("");
              post({ type: "saveSetting", key: SETTINGS.llmSystemPrompt, value: "" });
            }}
          />
        </CollapsibleSection>

        <hr className="cs-hr" />

        <CollapsibleSection title="Scrubbing" defaultOpen>
          <ScrubbingSection
            scrubbingPii={config.scrubbingPii}
            scrubbingSecrets={config.scrubbingSecrets}
            scrubbingEntropyThreshold={config.scrubbingEntropyThreshold}
            customPatternsDraft={customPatternsDraft}
            onPiiChange={(value) => {
              post({ type: "saveSetting", key: SETTINGS.scrubbingPii, value });
            }}
            onSecretsChange={(value) => {
              post({ type: "saveSetting", key: SETTINGS.scrubbingSecrets, value });
            }}
            onEntropyChange={(value) => {
              post({ type: "saveSetting", key: SETTINGS.scrubbingEntropyThreshold, value });
            }}
            onCustomPatternsChange={setCustomPatternsDraft}
            onCustomPatternsBlur={(text) => {
              post({ type: "saveSetting", key: SETTINGS.scrubbingCustomPatterns, value: draftToCustomPatterns(text) });
            }}
          />
        </CollapsibleSection>

        <hr className="cs-hr" />

        <CollapsibleSection title="Shortcut" defaultOpen>
          <ShortcutSection onRunCommand={runCommand} />
        </CollapsibleSection>
      </div>

      <hr className="cs-hr" />

      <CollapsibleSection title="Output" defaultOpen>
        <OutputSection
          logToOutputChannel={config.logToOutputChannel}
          onLogChange={(value) => {
            post({ type: "saveSetting", key: SETTINGS.logToOutputChannel, value });
          }}
          onRunCommand={runCommand}
        />
      </CollapsibleSection>
    </>
  );
}
