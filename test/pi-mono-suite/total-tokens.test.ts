// pi-mono equivalent: total-tokens.test.ts — totalTokens arithmetic.
// SKIP unless KIRO_LIVE_TEST=1.

import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] total-tokens: arithmetic invariants", () => {
  it("totalTokens always equals input + output", async () => {
    const response = await complete(
      suiteModel(),
      {
        messages: [
          { role: "user", content: "Reply with 'ok'.", timestamp: Date.now() },
        ],
      },
      suiteOptions(),
    );
    expect(response.usage.totalTokens).toBe(response.usage.input + response.usage.output);
  }, 60000);

  it("cost is non-negative", async () => {
    const response = await complete(
      suiteModel(),
      {
        messages: [{ role: "user", content: "Reply with 'ok'.", timestamp: Date.now() }],
      },
      suiteOptions(),
    );
    expect(response.usage.cost.total).toBeGreaterThanOrEqual(0);
  }, 60000);
});
