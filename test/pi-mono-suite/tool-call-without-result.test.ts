// pi-mono equivalent: tool-call-without-result.test.ts — replaying history
// where a prior assistant tool call has no matching tool result.
// SKIP unless KIRO_LIVE_TEST=1.

import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] tool-call-without-result: orphan tool calls", () => {
  it("does not 400 when history has assistant tool call but no matching result", async () => {
    const response = await complete(
      suiteModel(),
      {
        messages: [
          { role: "user", content: "First question", timestamp: Date.now() },
          {
            role: "assistant",
            content: [{ type: "toolCall", id: "orphan1", name: "do_thing", arguments: {} }],
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
          // No matching toolResult — sanitizeHistory should drop the orphan.
          { role: "user", content: "Reply with 'still here'.", timestamp: Date.now() },
        ],
      },
      suiteOptions(),
    );
    expect(response.stopReason).not.toBe("error");
    const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    expect(text.toLowerCase()).toContain("still here");
  }, 60000);
});
