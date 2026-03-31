import { useMemo, type ReactElement } from "react";
import { COMMANDS, WORKBENCH_COMMANDS } from "../../shared/constants";

export type ShortcutSectionProps = {
  onRunCommand: (command: string, args?: unknown[]) => void;
};

/**
 * Default keybinding for enhance, plus control to open Keyboard Shortcuts filtered for ContextShield.
 */
export function ShortcutSection({ onRunCommand }: ShortcutSectionProps): ReactElement {
  const isMac = useMemo(() => typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac"), []);

  return (
    <div className="section pb-0">
      <div className="shortcut-row">
        <span id="cs-shortcut-desc">Enhance selected text</span>
        <span aria-labelledby="cs-shortcut-desc">
          {isMac ? (
            <span className="keybinding">⌘⇧2</span>
          ) : (
            <span className="keybinding">Ctrl+Shift+2</span>
          )}
        </span>
      </div>
      <div className="cs-btn-row">
        <button
          type="button"
          className="cs-btn cs-btn-secondary"
          onClick={() => {
            onRunCommand(WORKBENCH_COMMANDS.openGlobalKeybindings, [COMMANDS.enhancePrompt]);
          }}
        >
          Change shortcut…
        </button>
      </div>
    </div>
  );
}
