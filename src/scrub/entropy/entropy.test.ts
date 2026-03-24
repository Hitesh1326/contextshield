import { shannonEntropy } from "./entropy";

describe("shannonEntropy", () => {
  it("returns 0 for empty string", () => {
    expect(shannonEntropy("")).toBe(0);
  });

  it("returns 0 for a single repeated character", () => {
    expect(shannonEntropy("aaaa")).toBe(0);
  });

  it("is positive for varied characters", () => {
    expect(shannonEntropy("abcd")).toBeGreaterThan(0);
  });

  it("is deterministic for the same input", () => {
    const s = "xK9mP2qL7nR4vT8w3sQ6mN5";
    expect(shannonEntropy(s)).toBe(shannonEntropy(s));
  });
});
