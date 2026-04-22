// js-tiktoken wrapper for output-token estimation.
//
// Kiro's streaming API doesn't reliably emit per-response output counts,
// so we fall back to a tiktoken estimate over everything the assistant
// emitted. `cl100k_base` is the standard Claude-family approximation.

import { getEncoding } from "js-tiktoken";

let encoder: ReturnType<typeof getEncoding> | null = null;

export function countTokens(text: string): number {
  if (!text) return 0;
  if (!encoder) encoder = getEncoding("cl100k_base");
  return encoder.encode(text).length;
}
