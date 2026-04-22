// pi-mono equivalent: cross-provider-handoff.test.ts — context from another
// provider (e.g. Anthropic) replayed through the Kiro provider.
// SKIP unless KIRO_LIVE_TEST=1.

import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] cross-provider-handoff: non-Kiro history replay", () => {
  it("accepts a prior assistant turn produced by a different provider", async () => {
    const response = await complete(
      suiteModel(),
      {
        messages: [
          { role: "user", content: "What's 2+2?", timestamp: Date.now() },
          {
            role: "assistant",
            // Note: different provider/api/model — simulating handoff.
            content: [{ type: "text", text: "4." }],
            api: "anthropic-messages",
            provider: "anthropic",
            model: "claude-sonnet-4-5",
            usage: {
              input: 10,
              output: 2,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 12,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "stop",
            timestamp: Date.now(),
          },
          { role: "user", content: "And what about 3+3?", timestamp: Date.now() },
        ],
      },
      suiteOptions(),
    );
    expect(response.stopReason).not.toBe("error");
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .toLowerCase();
    expect(text).toContain("6");
  }, 60000);
});
