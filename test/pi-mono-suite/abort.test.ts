// pi-mono equivalent: abort.test.ts — AbortSignal handling.
// SKIP unless KIRO_LIVE_TEST=1.

import { describe, expect, it } from "vitest";
import { complete, LIVE, streamKiro, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] abort: signal handling", () => {
  it("returns stopReason: aborted on immediate abort", async () => {
    const ac = new AbortController();
    ac.abort();
    const response = await complete(
      suiteModel(),
      { messages: [{ role: "user", content: "Hello", timestamp: Date.now() }] },
      suiteOptions({ signal: ac.signal }),
    );
    expect(response.stopReason).toBe("aborted");
  }, 30000);

  it("honors abort mid-stream", async () => {
    const ac = new AbortController();
    const s = streamKiro(
      suiteModel(),
      {
        messages: [
          {
            role: "user",
            content: "Write a 500-word story about a robot.",
            timestamp: Date.now(),
          },
        ],
      },
      suiteOptions({ signal: ac.signal }),
    );
    let chars = 0;
    for await (const e of s) {
      if (e.type === "text_delta") {
        chars += e.delta.length;
        if (chars > 30) {
          ac.abort();
          break;
        }
      }
    }
    const msg = await s.result();
    expect(msg.stopReason).toBe("aborted");
  }, 60000);
});
