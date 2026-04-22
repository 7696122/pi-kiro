// pi-mono equivalent: stream.test.ts — basic text generation + streaming events.
// SKIP unless KIRO_LIVE_TEST=1 and KIRO_ACCESS_TOKEN is set.

import { describe, expect, it } from "vitest";
import { complete, LIVE, streamKiro, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] stream: basic text generation", () => {
  it("completes a simple prompt with stopReason: stop", async () => {
    const response = await complete(
      suiteModel(),
      {
        systemPrompt: "You are a helpful assistant. Be concise.",
        messages: [
          {
            role: "user",
            content: "Reply with exactly: 'Hello test successful'",
            timestamp: Date.now(),
          },
        ],
      },
      suiteOptions(),
    );
    expect(response.role).toBe("assistant");
    expect(response.stopReason).toBe("stop");
    expect(response.usage.input).toBeGreaterThan(0);
    expect(response.usage.output).toBeGreaterThan(0);
    const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    expect(text.toLowerCase()).toContain("hello test successful");
  }, 60000);

  it("emits text_start / text_delta / text_end during streaming", async () => {
    const s = streamKiro(
      suiteModel(),
      {
        messages: [{ role: "user", content: "Count 1 to 3", timestamp: Date.now() }],
      },
      suiteOptions(),
    );
    let gotStart = false;
    let gotDelta = false;
    let gotEnd = false;
    let accumulated = "";
    for await (const e of s) {
      if (e.type === "text_start") gotStart = true;
      if (e.type === "text_delta") {
        gotDelta = true;
        accumulated += e.delta;
      }
      if (e.type === "text_end") gotEnd = true;
    }
    expect(gotStart).toBe(true);
    expect(gotDelta).toBe(true);
    expect(gotEnd).toBe(true);
    expect(accumulated.length).toBeGreaterThan(0);
  }, 60000);
});
