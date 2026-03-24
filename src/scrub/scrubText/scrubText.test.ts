import { defaultScrubConfig } from "../../test/defaultScrubConfig";
import { scrubText } from "./scrubText";

describe("scrubText", () => {
  it("redacts PII, AWS id, JWT, and high-entropy token in one pass", () => {
    const input = [
      "Contact: jane@example.org",
      "aws = AKIAIOSFODNN7EXAMPLE",
      "jwt = eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jGmNHl0w5NqX6kV9g5K8vH3mN2pQ7rT",
      "blob = xK9mP2qL7nR4vT8w3sQ6mN5aB1cD4eF8gH2jK0nM3pQ8rS1tU4vW7xY0zA2bC5dE"
    ].join("\n");

    const { text, entities, invalidPatterns } = scrubText(input, defaultScrubConfig());

    expect(text).toContain("[EMAIL]");
    expect(text).toContain("[SECRET]");
    expect(text).not.toContain("jane@example.org");
    expect(text).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(text).not.toContain("eyJhbGci");
    expect(entities.length).toBeGreaterThan(0);
    expect(invalidPatterns).toEqual([]);
  });

  it("leaves clean prose unchanged", () => {
    const input = "Fix the login button on the homepage.";
    const { text, entities } = scrubText(input, defaultScrubConfig());
    expect(text).toBe(input);
    expect(entities).toHaveLength(0);
  });

  it("skips PII when scrubbingPii is false", () => {
    const input = "Reach me at dev@company.com";
    const { text } = scrubText(input, defaultScrubConfig({ scrubbingPii: false }));
    expect(text).toBe(input);
  });

  it("skips secrets when scrubbingSecrets is false", () => {
    const input = "key = AKIAIOSFODNN7EXAMPLE";
    const { text } = scrubText(input, defaultScrubConfig({ scrubbingSecrets: false }));
    expect(text).toBe(input);
  });

  it("applies custom patterns and collects invalid regex strings", () => {
    const input = "id = SK-ABCDEFGH123456";
    const { text, entities, invalidPatterns } = scrubText(
      input,
      defaultScrubConfig({
        scrubbingCustomPatterns: ["\\bSK-[A-Z0-9]+\\b", "["]
      })
    );

    expect(text).toContain("[CUSTOM]");
    expect(text).not.toContain("SK-ABCDEFGH123456");
    expect(entities.some((e) => e.kind === "custom_pattern")).toBe(true);
    expect(invalidPatterns).toContain("[");
  });

  it("replaces JWT as a single secret, not three segments", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const { text, entities } = scrubText(`t = ${jwt}`, defaultScrubConfig());

    const secretCount = entities.filter((e) => e.kind === "secret_jwt").length;
    expect(secretCount).toBe(1);
    expect(text.split("[SECRET]").length - 1).toBe(1);
  });

  it("does not scrub a very short stripe-like token", () => {
    const input = "short_maybe_not_scrubbed = sk_test_1234";
    const { text } = scrubText(input, defaultScrubConfig());
    expect(text).toContain("sk_test_1234");
  });
});
