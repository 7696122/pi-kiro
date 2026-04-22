// pi-mono equivalent: image-limits.test.ts — image input handling.
// SKIP unless KIRO_LIVE_TEST=1.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { complete, LIVE, suiteModel, suiteOptions } from "./_harness";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe.skipIf(!LIVE)("[live] image-limits: multimodal input", () => {
  it("describes a red circle correctly", async () => {
    const imagePath = join(__dirname, "data", "red-circle.png");
    const base64 = readFileSync(imagePath).toString("base64");

    const response = await complete(
      suiteModel(),
      {
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What shape and color is this? Reply in English.",
              },
              { type: "image", mimeType: "image/png", data: base64 },
            ],
            timestamp: Date.now(),
          },
        ],
      },
      suiteOptions(),
    );
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .toLowerCase();
    expect(text).toContain("red");
    expect(text).toContain("circle");
  }, 120000);
});
