// pi-mono equivalent: empty.test.ts — empty/minimal responses.
// SKIP unless KIRO_LIVE_TEST=1.

import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

describe.skipIf(!LIVE)("[live] empty: edge-case inputs", () => {
  it("handles empty content array", async () => {
    const response = await complete(
      suiteModel(),
      { messages: [{ role: "user", content: [], timestamp: Date.now() }] },
      suiteOptions(),
    );
    expect(response).toBeDefined();
    expect(response.role).toBe("assistant");
    // Either stop with content, or error with a message.
    if (response.stopReason === "error") {
      expect(response.errorMessage).toBeDefined();
    }
  }, 60000);

  it("handles empty string content", async () => {
    const response = await complete(
      suiteModel(),
      { messages: [{ role: "user", content: "", timestamp: Date.now() }] },
      suiteOptions(),
    );
    expect(response).toBeDefined();
    expect(response.role).toBe("assistant");
  }, 60000);
});
