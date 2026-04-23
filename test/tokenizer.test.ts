import { describe, expect, it } from "vitest";
import { countTokens } from "../src/tokenizer";

describe("countTokens", () => {
  it("returns 0 for empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("returns positive count for non-empty text", () => {
    expect(countTokens("hello world")).toBeGreaterThan(0);
  });

  it("counts more tokens for longer text", () => {
    const short = countTokens("hello");
    const long = countTokens("hello ".repeat(50));
    expect(long).toBeGreaterThan(short);
  });

  it("handles unicode content", () => {
    expect(countTokens("héllo wörld")).toBeGreaterThan(0);
  });

  it("applies ~4-chars-per-token heuristic", () => {
    // Pins the divisor so a regression (e.g. /8 instead of /4) fails loudly.
    expect(countTokens("a".repeat(16))).toBe(4);
    expect(countTokens("a".repeat(17))).toBe(5); // Math.ceil
  });
});
