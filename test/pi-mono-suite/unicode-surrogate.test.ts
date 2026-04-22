// pi-mono equivalent: unicode-surrogate.test.ts — emoji / surrogate handling
// in user content and tool results doesn't cause JSON encoding errors.
// SKIP unless KIRO_LIVE_TEST=1.

import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] unicode-surrogate: emoji handling", () => {
  it("handles emoji in user content without JSON encoding errors", async () => {
    const response = await complete(
      suiteModel(),
      {
        messages: [
          {
            role: "user",
            content: "Reply 'seen' if you see this emoji: 🙈 🚀 🎉",
            timestamp: Date.now(),
          },
        ],
      },
      suiteOptions(),
    );
    expect(response.stopReason).not.toBe("error");
  }, 60000);

  it("handles emoji in tool results", async () => {
    const response = await complete(
      suiteModel(),
      {
        messages: [
          { role: "user", content: "What does the tool return?", timestamp: Date.now() },
          {
            role: "assistant",
            content: [
              { type: "toolCall", id: "t1", name: "get_emoji", arguments: {} },
            ],
            api: "kiro-api",
            provider: "kiro",
            model: "claude-haiku-4-5",
            usage: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "toolUse",
            timestamp: Date.now(),
          },
          {
            role: "toolResult",
            toolCallId: "t1",
            toolName: "get_emoji",
            content: [{ type: "text", text: "Result: 🙈🚀🎉 and unpaired: \uD800 end" }],
            isError: false,
            timestamp: Date.now(),
          },
        ],
      },
      suiteOptions(),
    );
    // The unpaired surrogate should be stripped by sanitizeSurrogates before
    // it hits the wire; the request should succeed, not error.
    expect(response.stopReason).not.toBe("error");
  }, 60000);
});
