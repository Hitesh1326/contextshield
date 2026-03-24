import type { ScrubEntity } from "../shared/types";
import type { IScrubber, ScrubStepResult } from "./interfaces/IScrubber";

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

/**
 * Redacts email, phone, IPv4, and UUID-like spans when PII scrubbing is enabled in settings.
 */
export class PiiScrubber implements IScrubber {
  constructor(private readonly enabled: boolean) {}

  scrub(text: string): ScrubStepResult {
    if (!this.enabled) {
      return { text, entities: [] };
    }

    const entities: ScrubEntity[] = [];

    let out = text.replace(EMAIL_RE, () => {
      entities.push({ kind: "email", placeholder: "[EMAIL]" });
      return "[EMAIL]";
    });

    out = out.replace(PHONE_RE, () => {
      entities.push({ kind: "phone", placeholder: "[PHONE]" });
      return "[PHONE]";
    });

    out = out.replace(IPV4_RE, () => {
      entities.push({ kind: "ip", placeholder: "[IP]" });
      return "[IP]";
    });

    out = out.replace(UUID_RE, () => {
      entities.push({ kind: "uuid", placeholder: "[UUID]" });
      return "[UUID]";
    });

    return { text: out, entities };
  }
}
