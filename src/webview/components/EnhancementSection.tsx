import type { ReactElement } from "react";
import { ToggleControl } from "./ToggleControl";

/** LLM enhancement toggle, custom system prompt, and max-new-tokens field. */
export type EnhancementSectionProps = {
  llmEnabled: boolean;
  llmSystemPrompt: string;
  llmMaxNewTokens: number;
  defaultSystemPromptPreview: string;
  onLlmEnabledChange: (value: boolean) => void;
  onSystemPromptChange: (value: string) => void;
  onSystemPromptBlur: (value: string) => void;
  onMaxTokensChange: (value: number) => void;
  onResetSystemPrompt: () => void;
};

/**
 * Enhancement settings: enable flag, optional system prompt (blur saves), and token limit.
 */
export function EnhancementSection({
  llmEnabled,
  llmSystemPrompt,
  llmMaxNewTokens,
  defaultSystemPromptPreview,
  onLlmEnabledChange,
  onSystemPromptChange,
  onSystemPromptBlur,
  onMaxTokensChange,
  onResetSystemPrompt
}: EnhancementSectionProps): ReactElement {
  const promptChars = llmSystemPrompt.length;
  const canReset = llmSystemPrompt.length > 0;

  return (
    <div className="section pb-0">
      <ToggleControl
        id="cs-llm-enabled"
        label="Enable enhancement (local model)"
        checked={llmEnabled}
        onChange={onLlmEnabledChange}
      />

      <div className="field">
        <div className="field-label-row">
          <label htmlFor="cs-system-prompt">
            Custom system prompt <span className="hint">(optional)</span>
          </label>
          <span className="hint" aria-live="polite">
            {promptChars} characters
          </span>
        </div>
        <textarea
          id="cs-system-prompt"
          rows={5}
          value={llmSystemPrompt}
          placeholder={defaultSystemPromptPreview}
          aria-describedby="cs-system-prompt-hint"
          onChange={(e) => {
            onSystemPromptChange(e.target.value);
          }}
          onBlur={(e) => {
            onSystemPromptBlur(e.target.value);
          }}
        />
        <p id="cs-system-prompt-hint" className="hint">
          Optional. Saves on blur.
        </p>
        <div className="cs-btn-row">
          <button
            type="button"
            className="cs-btn cs-btn-secondary"
            disabled={!canReset}
            onClick={() => {
              onResetSystemPrompt();
            }}
          >
            Reset to default
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="cs-max-tokens">Max new tokens</label>
        <input
          id="cs-max-tokens"
          type="number"
          min={128}
          max={2048}
          step={128}
          value={llmMaxNewTokens}
          onChange={(e) => {
            onMaxTokensChange(Number(e.target.value));
          }}
        />
      </div>
    </div>
  );
}
