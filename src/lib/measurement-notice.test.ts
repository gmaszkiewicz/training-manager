import { describe, expect, it } from "vitest";

import { measurementNoticeMessage } from "@/lib/measurement-notice";

describe("measurementNoticeMessage", () => {
  it("names the action and the saved minute", () => {
    expect(measurementNoticeMessage("added", "2026-10-19T18:30")).toBe("Measurement from 2026-10-19 18:30 was added.");
    expect(measurementNoticeMessage("updated", "2026-10-19T18:30")).toBe(
      "Measurement from 2026-10-19 18:30 was updated.",
    );
    expect(measurementNoticeMessage("deleted", "2026-10-19T18:30")).toBe(
      "Measurement from 2026-10-19 18:30 was deleted.",
    );
  });

  it("ignores an unknown action or a minute that is not a calendar time", () => {
    expect(measurementNoticeMessage("saved", "2026-10-19T18:30")).toBe(null);
    expect(measurementNoticeMessage("added", "2026-10-19 18:30")).toBe(null);
    expect(measurementNoticeMessage("added", "2026-13-19T18:30")).toBe(null);
    expect(measurementNoticeMessage(null, null)).toBe(null);
  });
});
