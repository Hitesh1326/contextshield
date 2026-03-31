import type { ReactElement } from "react";
import { COMMANDS } from "../../shared/constants";
import { ToggleControl } from "./ToggleControl";

export type OutputSectionProps = {
  logToOutputChannel: boolean;
  onLogChange: (value: boolean) => void;
  onRunCommand: (command: string, args?: unknown[]) => void;
};

/**
 * Audit logging toggle and shortcut to the ContextShield Output channel.
 */
export function OutputSection({ logToOutputChannel, onLogChange, onRunCommand }: OutputSectionProps): ReactElement {
  return (
    <div className="section pb-0">
      <ToggleControl
        id="cs-audit-log"
        label="Log to Output"
        checked={logToOutputChannel}
        onChange={onLogChange}
      />
      <div className="cs-btn-row">
        <button
          type="button"
          className="cs-btn cs-btn-secondary"
          onClick={() => {
            onRunCommand(COMMANDS.showOutput);
          }}
        >
          View logs
        </button>
      </div>
      <p className="hint mt-1.5">Shows scrub/enhance activity when enabled.</p>
    </div>
  );
}
