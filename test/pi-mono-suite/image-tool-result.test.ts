// pi-mono equivalent: image-tool-result.test.ts — images returned by tools.
// SKIP unless KIRO_LIVE_TEST=1.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe.skipIf(!LIVE)("[live] image-tool-result: images in tool results", () => {
  it("handles an image returned from a tool call", async () => {
    const imagePath = join(__dirname, "data", "red-circle.png");
    const base64 = readFileSync(imagePath).toString("base64");

    const response = await complete(
      suiteModel(),
      {
        messages: [
          {
            role: "user",
            content: "Use screenshot tool and describe what you see.",
            timestamp: Date.now(),
          },
          {
            role: "assistant",
            content: [{ type: "toolCall", id: "s1", name: "screenshot", arguments: {} }],
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
            toolCallId: "s1",
            toolName: "screenshot",
            content: [
              { type: "text", text: "Screenshot attached:" },
              { type: "image", mimeType: "image/png", data: base64 },
            ],
            isError: false,
            timestamp: Date.now(),
          },
        ],
      },
      suiteOptions(),
    );
    expect(response.stopReason).not.toBe("error");
  }, 120000);
});
