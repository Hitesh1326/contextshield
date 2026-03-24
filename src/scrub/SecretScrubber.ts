import type { ScrubEntity } from "../shared/types";
import { shannonEntropy } from "./entropy";
import type { IScrubber, ScrubStepResult } from "./interfaces/IScrubber";

/** IAM access key ID: `AKIA` plus 16 uppercase letters or digits (20 chars total). */
const AWS_ACCESS_KEY_ID_RE = /\bAKIA[0-9A-Z]{16}\b/g;

/** JWT-like token (header.payload.signature). */
const JWT_RE = /\b[A-Za-z0-9\-_]{8,}\.[A-Za-z0-9\-_]{8,}\.[A-Za-z0-9\-_]{8,}\b/g;

/** Candidate tokens for entropy-based secret detection. */
const HIGH_ENTROPY_TOKEN_RE = /\b[A-Za-z0-9+/=_\-]{16,}\b/g;

const PLACEHOLDER = "[SECRET]";

/**
 * Detects secrets: AWS access key IDs, JWT-shaped strings, then high-entropy tokens.
 * AWS and JWT run before entropy so long tokens are not partially redacted.
 * All matches use the placeholder `[SECRET]`; {@link ScrubEntity.kind} distinguishes the rule.
 */
export class SecretScrubber implements IScrubber {
  constructor(
    private readonly enabled: boolean,
    private readonly entropyThreshold: number
  ) {}

  /**
   * Runs AWS, JWT, then entropy passes. Each match is recorded with a rule-specific `kind` on {@link ScrubEntity}.
   */
  scrub(text: string): ScrubStepResult {
    if (!this.enabled) {
      return { text, entities: [] };
    }

    const entities: ScrubEntity[] = [];

    let out = text.replace(AWS_ACCESS_KEY_ID_RE, () => {
      entities.push({ kind: "secret_aws_access_key_id", placeholder: PLACEHOLDER });
      return PLACEHOLDER;
    });

    out = out.replace(JWT_RE, () => {
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
