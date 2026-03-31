import type { ReactElement } from "react";
import { WORKBENCH_COMMANDS } from "../../shared/constants";
import { ToggleControl } from "./ToggleControl";

export type GeneralSectionProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  onRunCommand: (command: string, args?: unknown[]) => void;
};

/**
 * Master enable switch and link to full VS Code settings.
 */
export function GeneralSection({ enabled, onEnabledChange, onRunCommand }: GeneralSectionProps): ReactElement {
  const inactive = !enabled;

  return (
    <div className="section pb-0">
      <ToggleControl id="cs-enabled" label="Enable ContextShield" checked={enabled} onChange={onEnabledChange} />
      {inactive ? (
        <p className="hint mt-1.5 mb-2" role="status">
          Disabled. Toggle on to activate.
        </p>
      ) : null}
      <div className={inactive ? "cs-disabled-subtree" : undefined} inert={inactive ? true : undefined}>
        <p className="hint mt-1.5">
          <button
            type="button"
            className="cs-link"
            disabled={inactive}
            onClick={() => {
              onRunCommand(WORKBENCH_COMMANDS.openSettings, ["contextshield"]);
            }}
          >
            Open in Settings
          </button>
        </p>
      </div>
    </div>
  );
}
