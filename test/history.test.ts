import { describe, expect, it } from "vitest";
import {
  addPlaceholderTools,
  extractToolNamesFromHistory,
  HISTORY_LIMIT,
  HISTORY_LIMIT_CONTEXT_WINDOW,
  sanitizeHistory,
  stripHistoryImages,
  truncateHistory,
} from "../src/history";
import type { KiroHistoryEntry, KiroToolResult, KiroToolSpec, KiroToolUse } from "../src/transform";

const userEntry = (content: string, toolResults?: KiroToolResult[]): KiroHistoryEntry => ({
  userInputMessage: {
    content,
    modelId: "M",
    origin: "KIRO_CLI",
    ...(toolResults ? { userInputMessageContext: { toolResults } } : {}),
  },
});

const assistantEntry = (content: string, toolUses?: KiroToolUse[]): KiroHistoryEntry => ({
  assistantResponseMessage: { content, ...(toolUses ? { toolUses } : {}) },
});

const toolSpec = (name: string): KiroToolSpec => ({
  toolSpecification: { name, description: "d", inputSchema: { json: { type: "object", properties: {} } } },
});

describe("sanitizeHistory", () => {
  it("keeps well-formed user→assistant pairs", () => {
    expect(sanitizeHistory([userEntry("hi"), assistantEntry("hello")])).toHaveLength(2);
  });

  it("drops assistant toolUses without following toolResult", () => {
    const h = [
      userEntry("go"),
      assistantEntry("ok", [{ name: "bash", toolUseId: "tc1", input: {} }]),
      userEntry("next"),
    ];
    expect(sanitizeHistory(h).find((e) => e.assistantResponseMessage?.toolUses)).toBeUndefined();
  });

  it("keeps assistant toolUses when followed by toolResult", () => {
    const h = [
      userEntry("go"),
      assistantEntry("ok", [{ name: "bash", toolUseId: "tc1", input: {} }]),
      userEntry("results", [{ toolUseId: "tc1", content: [{ text: "ok" }], status: "success" }]),
    ];
    expect(sanitizeHistory(h)).toHaveLength(3);
  });

  it("drops orphan toolResult without preceding toolUse", () => {
    const h = [userEntry("results", [{ toolUseId: "tc1", content: [{ text: "ok" }], status: "success" }])];
    expect(sanitizeHistory(h)).toHaveLength(0);
  });

  it("strips leading toolResults entry, keeps subsequent valid entries", () => {
    const h = [
      userEntry("tool results", [{ toolUseId: "tc1", content: [{ text: "done" }], status: "success" }]),
      userEntry("what time is it?"),
      assistantEntry("noon"),
    ];
    const r = sanitizeHistory(h);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]?.userInputMessage).toBeDefined();
    expect(r[0]?.userInputMessage?.userInputMessageContext?.toolResults).toBeUndefined();
  });

  it("strips leading assistant entry, keeps subsequent valid entries", () => {
    const h = [assistantEntry("stale"), userEntry("new user"), assistantEntry("response")];
    const r = sanitizeHistory(h);
    expect(r[0]?.userInputMessage).toBeDefined();
  });

  it("drops empty assistant entries", () => {
    const h = [userEntry("hi"), { assistantResponseMessage: { content: "" } }, userEntry("continue")];
    expect(sanitizeHistory(h).find((e) => e.assistantResponseMessage?.content === "")).toBeUndefined();
  });
});

describe("truncateHistory", () => {
  it("returns unchanged if under limit", () => {
    const h = [userEntry("hi"), assistantEntry("hello")];
    expect(truncateHistory(h, HISTORY_LIMIT)).toHaveLength(2);
  });

  it("removes oldest entries when over limit", () => {
    const big = Array.from({ length: 100 }, () => [
      userEntry(`msg ${"x".repeat(10000)}`),
      assistantEntry(`reply ${"y".repeat(10000)}`),
    ]).flat();
    const r = truncateHistory(big, 50000);
    expect(JSON.stringify(r).length).toBeLessThanOrEqual(50000);
    if (r.length > 0) expect(r[0]?.userInputMessage).toBeDefined();
  });

  it("scaled limit for 1M context retains history that fixed limit would truncate", () => {
    const entrySize = 10000;
    const count = Math.ceil(HISTORY_LIMIT / entrySize) + 10;
    const big = Array.from({ length: count }, (_, i) => [
      userEntry(`msg-${i} ${"x".repeat(entrySize)}`),
      assistantEntry(`reply-${i} ${"y".repeat(entrySize)}`),
    ]).flat();
    expect(JSON.stringify(big).length).toBeGreaterThan(HISTORY_LIMIT);

    const fixed = truncateHistory(big, HISTORY_LIMIT);
    expect(fixed.length).toBeLessThan(big.length);

    const scaledLimit = Math.floor((1_000_000 / HISTORY_LIMIT_CONTEXT_WINDOW) * HISTORY_LIMIT);
    expect(scaledLimit).toBe(4_250_000);
    const scaled = truncateHistory(big, scaledLimit);
    expect(scaled.length).toBe(big.length);
  });
});

describe("extractToolNamesFromHistory", () => {
  it("collects tool names from assistant entries", () => {
    const names = extractToolNamesFromHistory([
      assistantEntry("ok", [{ name: "bash", toolUseId: "tc1", input: {} }]),
      assistantEntry("ok", [{ name: "read", toolUseId: "tc2", input: {} }]),
    ]);
    expect(names).toContain("bash");
    expect(names).toContain("read");
  });
});

describe("stripHistoryImages", () => {
  it("removes images from userInputMessage entries", () => {
    const h: KiroHistoryEntry[] = [
      {
        userInputMessage: {
          content: "see this",
          modelId: "M",
          origin: "KIRO_CLI",
          images: [{ format: "png", source: { bytes: "data" } }],
        },
      },
      assistantEntry("seen"),
    ];
    const stripped = stripHistoryImages(h);
    expect(stripped[0]?.userInputMessage?.images).toBeUndefined();
    expect(stripped[0]?.userInputMessage?.content).toBe("see this");
  });

  it("does not mutate original", () => {
    const images = [{ format: "png", source: { bytes: "d" } }];
    const h: KiroHistoryEntry[] = [
      { userInputMessage: { content: "c", modelId: "M", origin: "KIRO_CLI", images } },
    ];
    stripHistoryImages(h);
    expect(h[0]?.userInputMessage?.images).toEqual(images);
  });
});

describe("truncateHistory with images", () => {
  it("strips all images after truncation", () => {
    const h: KiroHistoryEntry[] = [
      {
        userInputMessage: {
          content: "look",
          modelId: "M",
          origin: "KIRO_CLI",
          images: [{ format: "png", source: { bytes: "x".repeat(1000) } }],
        },
      },
      assistantEntry("ok"),
      userEntry("thanks"),
      assistantEntry("welcome"),
    ];
    const r = truncateHistory(h, HISTORY_LIMIT);
    for (const entry of r) {
      expect(entry.userInputMessage?.images).toBeUndefined();
    }
  });

  it("converges when a single entry exceeds the limit", () => {
    const huge = "x".repeat(2_000_000);
    const h: KiroHistoryEntry[] = [
      {
        userInputMessage: {
          content: "huge",
          modelId: "M",
          origin: "KIRO_CLI",
          images: [{ format: "png", source: { bytes: huge } }],
        },
      },
      assistantEntry("seen"),
      userEntry("what?"),
      assistantEntry("a cat"),
    ];
    const r = truncateHistory(h, HISTORY_LIMIT);
    expect(JSON.stringify(r).length).toBeLessThanOrEqual(HISTORY_LIMIT);
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("addPlaceholderTools", () => {
  it("stubs tools referenced in history but missing from current", () => {
    const tools = [toolSpec("bash")];
    const h = [assistantEntry("ok", [{ name: "old_tool", toolUseId: "tc1", input: {} }])];
    const r = addPlaceholderTools(tools, h);
    expect(r.find((t) => t.toolSpecification.name === "old_tool")).toBeDefined();
    expect(r).toHaveLength(2);
  });

  it("does not duplicate existing tools", () => {
    const tools = [toolSpec("bash")];
    const h = [assistantEntry("ok", [{ name: "bash", toolUseId: "tc1", input: {} }])];
    expect(addPlaceholderTools(tools, h)).toHaveLength(1);
  });

  it("returns input unchanged when history has no tool uses", () => {
    const tools = [toolSpec("bash")];
    expect(addPlaceholderTools(tools, [userEntry("hi")])).toEqual(tools);
  });
});
