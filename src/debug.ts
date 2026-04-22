// Leveled logger gated by KIRO_LOG env var.
//
// Levels: error (always on) / warn (default) / info / debug.
// Set KIRO_LOG=debug|info|warn|error to change the threshold.

export type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function currentLevel(): LogLevel {
  const raw = (globalThis.process?.env?.KIRO_LOG ?? "").toLowerCase();
  if (raw === "error" || raw === "warn" || raw === "info" || raw === "debug") return raw;
  return "warn";
}

function enabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel()];
}

function emit(level: LogLevel, message: string, data?: unknown): void {
  if (!enabled(level)) return;
  const prefix = `[pi-kiro] ${level.toUpperCase()}`;
  if (data === undefined) {
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
      `${prefix} ${message}`,
    );
  } else {
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
      `${prefix} ${message}`,
      data,
    );
  }
}

export const log = {
  error: (msg: string, data?: unknown) => emit("error", msg, data),
  warn: (msg: string, data?: unknown) => emit("warn", msg, data),
  info: (msg: string, data?: unknown) => emit("info", msg, data),
  debug: (msg: string, data?: unknown) => emit("debug", msg, data),
  /** True when the current threshold includes `debug`. Use to avoid
   *  expensive serialization of payloads we won't log. */
  isDebug: () => enabled("debug"),
};
