import type { ReactElement } from "react";
import { SCRUBBING_ENTROPY } from "../../shared/constants";
import { ToggleControl } from "./ToggleControl";

/** Clipboard scrubbing toggles, entropy threshold, and custom regex patterns. */
export type ScrubbingSectionProps = {
  scrubbingPii: boolean;
  scrubbingSecrets: boolean;
  scrubbingEntropyThreshold: number;
  customPatternsDraft: string;
  onPiiChange: (value: boolean) => void;
  onSecretsChange: (value: boolean) => void;
  onEntropyChange: (value: number) => void;
  onCustomPatternsChange: (value: string) => void;
  onCustomPatternsBlur: (value: string) => void;
};

function clampEntropy(n: number): number {
  return Math.min(SCRUBBING_ENTROPY.max, Math.max(SCRUBBING_ENTROPY.min, n));
}

/** Scrubbing section: PII, secrets, entropy, and optional per-line regex patterns. */
export function ScrubbingSection({
  scrubbingPii,
  scrubbingSecrets,
  scrubbingEntropyThreshold,
  customPatternsDraft,
  onPiiChange,
  onSecretsChange,
  onEntropyChange,
  onCustomPatternsChange,
  onCustomPatternsBlur
}: ScrubbingSectionProps): ReactElement {
  const { min, max, step, default: defaultEntropy } = SCRUBBING_ENTROPY;

  return (
    <div className="section pb-0">
      <ToggleControl
        id="cs-scrub-pii"
        label="Detect PII (email, phone, IP, UUID)"
        checked={scrubbingPii}
        onChange={onPiiChange}
      />

      <ToggleControl
        id="cs-scrub-secrets"
        label="Detect secrets (API keys, JWTs, high-entropy tokens)"
        checked={scrubbingSecrets}
        onChange={onSecretsChange}
      />

      <div className="field">
        <label htmlFor="cs-entropy">
          Entropy threshold <span className="hint">{`(allowed ${min}–${max}, default ${defaultEntropy})`}</span>
        </label>
        <input
          id="cs-entropy"
          type="number"
          min={min}
          max={max}
          step={step}
          value={scrubbingEntropyThreshold}
          aria-describedby="cs-entropy-hint"
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) {
              return;
            }
            onEntropyChange(clampEntropy(n));
          }}
        />
        <p id="cs-entropy-hint" className="hint">
          Higher values reduce false positives. Lower values catch more secrets.
        </p>
      </div>

      <div className="field">
        <label htmlFor="cs-custom-patterns">Custom regex patterns</label>
        <textarea
          id="cs-custom-patterns"
          rows={4}
          className="font-mono text-[11px]"
          value={customPatternsDraft}
          placeholder={"One JavaScript regex per line\ne.g. sk_live_[a-zA-Z0-9]+"}
          aria-describedby="cs-custom-patterns-hint"
          spellCheck={false}
          onChange={(e) => {
            onCustomPatternsChange(e.target.value);
          }}
          onBlur={(e) => {
            onCustomPatternsBlur(e.target.value);
          }}
        />
        <p id="cs-custom-patterns-hint" className="hint">
          One per line. Invalid patterns ignored.
        </p>
      </div>
    </div>
  );
}
