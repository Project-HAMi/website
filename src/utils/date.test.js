import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatShortDate, formatNumericDate, formatDateRange } from "./date.js";

// Regression test for #659: date-only values (e.g. blog/case-study frontmatter)
// parse to UTC midnight, so formatting them in a non-UTC local timezone could
// shift the displayed date back a day for visitors west of UTC.
test("formatDate keeps a date-only value on the same day regardless of format width", () => {
  assert.equal(formatDate("2026-01-05", "en"), "January 5, 2026");
  assert.equal(formatShortDate("2026-01-05", "en"), "Jan 5, 2026");
  assert.equal(formatNumericDate("2026-01-05", "en"), "1/5/2026");
});

test("formatDate/formatShortDate/formatNumericDate localize to zh-CN", () => {
  assert.equal(formatDate("2026-01-05", "zh"), "2026年1月5日");
  assert.equal(formatShortDate("2026-01-05", "zh"), "2026年1月5日");
  assert.equal(formatNumericDate("2026-01-05", "zh"), "2026/1/5");
});

test("formatDateRange formats a multi-day event range in en", () => {
  const range = formatDateRange("2026-03-10", "2026-03-12", "en");
  assert.match(range, /^March 10\s.\s12, 2026$/);
});

test("formatDateRange falls back to a manual join when Intl lacks formatRange", () => {
  const OriginalDateTimeFormat = Intl.DateTimeFormat;
  class NoRangeFormat extends OriginalDateTimeFormat {
    constructor(...args) {
      super(...args);
    }
  }
  // Simulate an environment (e.g. older Safari) without formatRange support.
  NoRangeFormat.prototype.formatRange = undefined;
  Intl.DateTimeFormat = NoRangeFormat;
  try {
    const range = formatDateRange("2026-03-10", "2026-03-12", "en");
    assert.equal(range, "March 10, 2026 - March 12, 2026");
  } finally {
    Intl.DateTimeFormat = OriginalDateTimeFormat;
  }
});
