import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  SESSION_BOOTSTRAP_TIMEOUT_MS,
  withTimeout,
} from "./use-bootstrap-auth";

describe("useBootstrapAuth helpers", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves successful bootstrap work before the timeout", async () => {
    await expect(
      withTimeout(Promise.resolve("ok"), 25, "Session bootstrap timed out."),
    ).resolves.toBe("ok");
  });

  it("rejects when bootstrap work does not complete before the timeout", async () => {
    jest.useFakeTimers();

    const pendingPromise = withTimeout(
      new Promise<never>(() => undefined),
      SESSION_BOOTSTRAP_TIMEOUT_MS,
      "Session bootstrap timed out.",
    );

    jest.advanceTimersByTime(SESSION_BOOTSTRAP_TIMEOUT_MS);

    await expect(pendingPromise).rejects.toThrow(
      "Session bootstrap timed out.",
    );
  });
});
