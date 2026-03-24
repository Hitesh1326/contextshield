import type { ScrubResult } from "../../shared/types";

/** Full scrub output including invalid user regex strings for logging. */
export type ScrubTextResult = ScrubResult & { readonly invalidPatterns: readonly string[] };
