// Kiro history maintenance: sanitization, image stripping, size-budgeted
// truncation, and placeholder-tool injection for tools referenced in history
// but not in the current tool set.

import type { KiroHistoryEntry, KiroToolSpec } from "./transform";

/** Default char-length budget for history (calibrated for 200K-token models). */
export const HISTORY_LIMIT = 850_000;

/** The context-window size (in tokens) that HISTORY_LIMIT was calibrated for. */
export const HISTORY_LIMIT_CONTEXT_WINDOW = 200_000;

/**
 * Strip images from history entries. They've already been processed by the
 * model in prior turns; re-sending them wastes context and sometimes causes
 * 413s.
 */
export function stripHistoryImages(history: KiroHistoryEntry[]): KiroHistoryEntry[] {
  return history.map((entry) => {
    if (!entry.userInputMessage?.images) return entry;
    const { images: _images, ...rest } = entry.userInputMessage;
    return { ...entry, userInputMessage: { ...rest } };
  });
}

/**
 * Sanitize history:
 * - Drop leading entries that aren't valid userInputMessages (including leading
 *   tool-result entries that would leave the history orphaned after truncation).
 * - Drop empty assistant entries.
 * - Drop assistant toolUses not followed by matching toolResults.
 * - Drop orphan toolResults not preceded by matching toolUses.
 */
export function sanitizeHistory(history: KiroHistoryEntry[]): KiroHistoryEntry[] {
  let h = history;
  while (
    h.length > 0 &&
    (!h[0]?.userInputMessage ||
      h[0]?.userInputMessage?.userInputMessageContext?.toolResults !== undefined)
  ) {
    h = h.slice(1);
  }

  const result: KiroHistoryEntry[] = [];
  for (let i = 0; i < h.length; i++) {
    const m = h[i];
    if (!m) continue;

    if (
      m.assistantResponseMessage &&
      !m.assistantResponseMessage.toolUses &&
      !m.assistantResponseMessage.content
    ) {
      continue;
    }

    if (m.assistantResponseMessage?.toolUses) {
      const next = h[i + 1];
      if (next?.userInputMessage?.userInputMessageContext?.toolResults) result.push(m);
      continue;
    }

    if (m.userInputMessage?.userInputMessageContext?.toolResults) {
      const prev = result[result.length - 1];
      if (prev?.assistantResponseMessage?.toolUses) result.push(m);
      continue;
    }

    result.push(m);
  }
  return result;
}

/**
 * Size-budgeted truncation. Strips images first (cheap win), then shifts the
 * oldest entry and re-sanitizes until JSON size is under `limit`. Callers
 * should scale `limit` to the model's context window.
 */
export function truncateHistory(history: KiroHistoryEntry[], limit: number): KiroHistoryEntry[] {
  let sanitized = sanitizeHistory(stripHistoryImages(history));
  while (JSON.stringify(sanitized).length > limit && sanitized.length > 2) {
    sanitized.shift();
    while (sanitized.length > 0 && !sanitized[0]?.userInputMessage) sanitized.shift();
    sanitized = sanitizeHistory(sanitized);
  }
  return sanitized;
}

export function extractToolNamesFromHistory(history: KiroHistoryEntry[]): Set<string> {
  const names = new Set<string>();
  for (const entry of history) {
    for (const tu of entry.assistantResponseMessage?.toolUses ?? []) {
      if (tu.name) names.add(tu.name);
    }
  }
  return names;
}

/**
 * Add empty-schema tool specs for tools that appear in history but aren't in
 * the current tool set. Kiro rejects history that references undefined tools.
 */
export function addPlaceholderTools(
  tools: KiroToolSpec[],
  history: KiroHistoryEntry[],
): KiroToolSpec[] {
  const historyNames = extractToolNamesFromHistory(history);
  if (historyNames.size === 0) return tools;
  const existing = new Set(tools.map((t) => t.toolSpecification.name));
  const missing = Array.from(historyNames).filter((n) => !existing.has(n));
  if (missing.length === 0) return tools;
  return [
    ...tools,
    ...missing.map((name) => ({
      toolSpecification: {
        name,
        description: "Tool",
        inputSchema: { json: { type: "object" as const, properties: {} } },
      },
    })),
  ];
}
