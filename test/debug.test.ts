import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "../src/debug";

describe("log levels", () => {
  const originalLevel = process.env.KIRO_LOG;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
    if (originalLevel === undefined) delete process.env.KIRO_LOG;
    else process.env.KIRO_LOG = originalLevel;
  });

  it("default (warn) logs error and warn but not info/debug", () => {
    delete process.env.KIRO_LOG;
    log.error("e");
    log.warn("w");
    log.info("i");
    log.debug("d");
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("KIRO_LOG=debug enables all levels", () => {
    process.env.KIRO_LOG = "debug";
    log.error("e");
    log.warn("w");
    log.info("i");
    log.debug("d");
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it("KIRO_LOG=error suppresses warn/info/debug", () => {
    process.env.KIRO_LOG = "error";
    log.error("e");
    log.warn("w");
    log.info("i");
    log.debug("d");
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("isDebug() reflects current threshold", () => {
    delete process.env.KIRO_LOG;
    expect(log.isDebug()).toBe(false);
    process.env.KIRO_LOG = "debug";
    expect(log.isDebug()).toBe(true);
  });

  it("invalid KIRO_LOG falls back to warn default", () => {
    process.env.KIRO_LOG = "shouty";
    log.warn("w");
    log.info("i");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
