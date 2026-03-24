import type { ScrubEntity } from "../shared/types";
import { shannonEntropy } from "./entropy";
import type { IScrubber, ScrubStepResult } from "./interfaces/IScrubber";

/** JWT-like token (header.payload.signature). */
const JWT_RE = /\b[A-Za-z0-9\-_]{8,}\.[A-Za-z0-9\-_]{8,}\.[A-Za-z0-9\-_]{8,}\b/g;

/** Candidate tokens for entropy-based secret detection. */
const HIGH_ENTROPY_TOKEN_RE = /\b[A-Za-z0-9+/=_\-]{16,}\b/g;

const PLACEHOLDER = "[SECRET]";

/**
 * JWT pass first (whole token), then high-entropy tokens — avoids matching inside JWT segments.
 * Every match uses the same placeholder; {@link ScrubEntity} entries still count each span.
 */
export class SecretScrubber implements IScrubber {
  constructor(
    private readonly enabled: boolean,
    private readonly entropyThreshold: number
  ) {}

  scrub(text: string): ScrubStepResult {
    if (!this.enabled) {
      return { text, entities: [] };
    }

    const entities: ScrubEntity[] = [];

    let out = text.replace(JWT_RE, () => {
      entities.push({ kind: "secret_jwt", placeholder: PLACEHOLDER });
      return PLACEHOLDER;
    });

    out = out.replace(HIGH_ENTROPY_TOKEN_RE, (match) => {
      if (shannonEntropy(match) >= this.entropyThreshold) {
        entities.push({ kind: "secret_entropy", placeholder: PLACEHOLDER });
        return PLACEHOLDER;
      }
      return match;
    });

    return { text: out, entities };
  }
}
