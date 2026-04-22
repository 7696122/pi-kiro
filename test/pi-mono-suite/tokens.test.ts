// pi-mono equivalent: tokens.test.ts — token counting and usage.
// SKIP unless KIRO_LIVE_TEST=1.

import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] tokens: usage reporting", () => {
  it("populates usage.input + usage.output on completion", async () => {
    const response = await complete(
      suiteModel(),
      {
        messages: [
          { role: "user", content: "Say 'hi' in exactly one word.", timestamp: Date.now() },
        ],
      },
      suiteOptions(),
    );
    expect(response.usage.input).toBeGreaterThan(0);
    expect(response.usage.output).toBeGreaterThan(0);
    expect(response.usage.totalTokens).toBe(response.usage.input + response.usage.output);
  }, 60000);
});
