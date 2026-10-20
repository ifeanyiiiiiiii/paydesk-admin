import { describe, expect, it } from "vitest";
import { formatCount, formatDateTime } from "./format";

describe("formatDateTime", () => {
  it("shows Lagos time (UTC+1) regardless of the machine's time zone", () => {
    expect(formatDateTime("2026-10-20T13:05:00.000Z")).toMatch(/20 Oct 2026.*14:05/);
  });

  it("rolls over to the next day in Lagos", () => {
    expect(formatDateTime("2026-10-20T23:30:00.000Z")).toMatch(/21 Oct 2026.*00:30/);
  });
});

describe("formatCount", () => {
  it("adds thousands separators", () => {
    expect(formatCount(4812)).toBe("4,812");
  });
});
