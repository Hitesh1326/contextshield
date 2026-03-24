import type { ContextShieldConfig, ScrubEntity, ScrubResult } from "../shared/types";
import { shannonEntropy } from "./entropy";

/** Result of a scrub pass, including invalid user-supplied regex patterns (for logging). */
export type ScrubTextResult = ScrubResult & { readonly invalidPatterns: readonly string[] };

/** Email (common cases). */
const EMAIL_RE = /\b[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}\b/g;

/** US-style phone (loose). */
const PHONE_RE =
  /(?<![A-Za-z0-9])(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?![A-Za-z0-9])/g;

/** IPv4 (may match version numbers — acceptable for defensive redaction). */
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

/** UUID v4-ish. */
const UUID_RE =
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g;

/** Candidate tokens for entropy-based secret detection. */
const HIGH_ENTROPY_TOKEN_RE = /\b[A-Za-z0-9+/=_\-]{16,}\b/g;
/** JWT-like token (header.payload.signature). */
const JWT_RE = /\b[A-Za-z0-9\-_]{8,}\.[A-Za-z0-9\-_]{8,}\.[A-Za-z0-9\-_]{8,}\b/g;

function pushEntity(entities: ScrubEntity[], kind: string, placeholder: string): void {
  entities.push({ kind, placeholder });
}

/**
 * Redacts PII, secrets, and custom patterns according to workspace `ContextShieldConfig`.
 *
 * @param input - Raw text to scan.
 * @param config - Feature toggles and thresholds from workspace settings.
 * @returns Redacted text, entity list, and any invalid regex patterns from the user.
 */
export function scrubText(input: string, config: ContextShieldConfig): ScrubTextResult {
  let text = input;
  const entities: ScrubEntity[] = [];
  const invalidPatterns: string[] = [];
  let emailCounter = 0;
  let phoneCounter = 0;
  let ipCounter = 0;
  let uuidCounter = 0;
  let secretCounter = 0;
  let customCounter = 0;

  if (config.scrubbingPii) {
    text = text.replace(EMAIL_RE, () => {
      const placeholder = `[EMAIL_${++emailCounter}]`;
      pushEntity(entities, "email", placeholder);
      return placeholder;
    });

    text = text.replace(PHONE_RE, () => {
      const placeholder = `[PHONE_${++phoneCounter}]`;
      pushEntity(entities, "phone", placeholder);
      return placeholder;
    });

    text = text.replace(IPV4_RE, () => {
      const placeholder = `[IP_${++ipCounter}]`;
      pushEntity(entities, "ip", placeholder);
      return placeholder;
    });

    text = text.replace(UUID_RE, () => {
      const placeholder = `[UUID_${++uuidCounter}]`;
      pushEntity(entities, "uuid", placeholder);
      return placeholder;
    });
  }

  for (const pattern of config.scrubbingCustomPatterns) {
    const trimmed = pattern.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const re = new RegExp(trimmed, "g");
      text = text.replace(re, () => {
        const placeholder = `[CUSTOM_${++customCounter}]`;
        pushEntity(entities, "custom_pattern", placeholder);
        return placeholder;
      });
    } catch {
      invalidPatterns.push(trimmed);
    }
  }

  if (config.scrubbingSecrets) {
    text = text.replace(JWT_RE, () => {
      const placeholder = `[SECRET_${++secretCounter}]`;
      pushEntity(entities, "secret_jwt", placeholder);
      return placeholder;
    });

    const threshold = config.scrubbingEntropyThreshold;
    text = text.replace(HIGH_ENTROPY_TOKEN_RE, (match) => {
      if (shannonEntropy(match) >= threshold) {
        const placeholder = `[SECRET_${++secretCounter}]`;
        pushEntity(entities, "secret_entropy", placeholder);
        return placeholder;
      }
      return match;
    });
  }

  return { text, entities, invalidPatterns };
}
