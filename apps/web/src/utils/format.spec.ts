import { describe, expect, it } from "vitest";

import { formatDate } from "./format";

describe("formatDate", () => {
  it("keeps UTC midnight date-only values on the intended calendar day", () => {
    expect(formatDate("2026-04-01T00:00:00.000Z")).toBe("Apr 1, 2026");
  });

  it("renders datetime values on the local calendar day when requested", () => {
    expect(formatDate("2026-04-02T00:00:00.000Z", { mode: "datetime" })).toBe(
      "Apr 1, 2026",
    );
  });

  it("returns Not set for missing values", () => {
    expect(formatDate(null)).toBe("Not set");
  });
});
