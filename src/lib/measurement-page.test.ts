import { describe, expect, it } from "vitest";

import {
  dayStorageKey,
  defaultPageSize,
  filterByMonth,
  measurementMonth,
  pageSizeStorageKey,
  pageSizes,
  pageSlice,
  parsePageSize,
  utcToday,
  viewOf,
} from "@/lib/measurement-page";

const today = "2026-10-08";

describe("measurementMonth", () => {
  it("reads yyyy-mm from a T or a space", () => {
    expect(measurementMonth("2026-01-01T07:00:00")).toBe("2026-01");
    expect(measurementMonth("2026-01-01 07:00:00")).toBe("2026-01");
  });
});

describe("utcToday", () => {
  it("uses the UTC calendar day", () => {
    expect(utcToday(new Date("2026-10-08T00:00:00.000Z"))).toBe(today);
    expect(utcToday(new Date("2026-10-08T23:30:00.000Z"))).toBe(today);
  });
});

describe("parsePageSize", () => {
  it("exports 5, 10, and 15 with default 10", () => {
    expect(pageSizes).toEqual([5, 10, 15]);
    expect(defaultPageSize).toBe(10);
  });

  it("accepts the stored page sizes and falls back to 10", () => {
    expect(parsePageSize("5")).toBe(5);
    expect(parsePageSize("10")).toBe(10);
    expect(parsePageSize("15")).toBe(15);
    expect(parsePageSize("10.0")).toBe(10);
    expect(parsePageSize(" 10")).toBe(10);
    expect(parsePageSize(10)).toBe(10);
    expect(parsePageSize("7")).toBe(10);
    expect(parsePageSize(null)).toBe(10);
  });
});

describe("storage keys", () => {
  it("scopes page size to the account and the day to the account and trainee", () => {
    expect(pageSizeStorageKey("account-1")).toBe("tm.measurements.pageSize.account-1");
    expect(dayStorageKey("account-1", "trainee-2")).toBe("tm.measurements.day.account-1.trainee-2");
  });
});

describe("viewOf", () => {
  it("lists each measurement month once, plus the current month, newest first", () => {
    const view = viewOf({
      entries: [
        { id: "late", measured_on: "2026-10-09T08:00:00" },
        { id: "evening", measured_on: "2026-02-01T19:00:00" },
        { id: "morning", measured_on: "2026-02-01 07:00:00" },
        { id: "january", measured_on: "2026-01-01T07:00:00" },
        { id: "today-row", measured_on: "2026-10-08T12:00:00" },
      ],
      today,
      pageSize: 10,
      focusedEntryId: null,
      savedDay: null,
    });

    expect(view.dates).toEqual(["2026-10", "2026-02", "2026-01"]);
    expect(view.day).toBe("2026-10");
    expect(view.page).toBe(1);
  });

  it("falls back to today when no day is saved", () => {
    const view = viewOf({
      entries: [{ id: "a", measured_on: "2026-09-01T08:00:00" }],
      today,
      pageSize: 10,
      focusedEntryId: null,
      savedDay: null,
    });

    expect(view.day).toBe("2026-10");
    expect(view.page).toBe(1);
  });

  it("falls back to the current month when the saved month is not listed", () => {
    const view = viewOf({
      entries: [{ id: "a", measured_on: "2026-09-01T08:00:00" }],
      today,
      pageSize: 10,
      focusedEntryId: null,
      savedDay: "2026-03-03",
    });

    expect(view.dates).toEqual(["2026-10", "2026-09"]);
    expect(view.day).toBe("2026-10");
    expect(view.page).toBe(1);
  });

  it("uses a saved day that is in the list and starts on page 1", () => {
    const view = viewOf({
      entries: [
        { id: "a", measured_on: "2026-09-01T08:00:00" },
        { id: "b", measured_on: "2026-08-01T08:00:00" },
      ],
      today,
      pageSize: 10,
      focusedEntryId: null,
      savedDay: "2026-08-01",
    });

    expect(view.day).toBe("2026-08");
    expect(view.page).toBe(1);
  });

  it("shows a focused entry on its day and page when another day is saved", () => {
    const view = viewOf({
      entries: [
        { id: "p0", measured_on: "2026-09-01T18:00:00" },
        { id: "p1", measured_on: "2026-09-01T17:00:00" },
        { id: "p2", measured_on: "2026-09-01T16:00:00" },
        { id: "p3", measured_on: "2026-09-01T15:00:00" },
        { id: "p4", measured_on: "2026-09-01T14:00:00" },
        { id: "p5", measured_on: "2026-09-01T13:00:00" },
        { id: "aug", measured_on: "2026-08-15T08:00:00" },
      ],
      today,
      pageSize: 5,
      focusedEntryId: "p5",
      savedDay: "2026-08-15",
    });

    expect(view.day).toBe("2026-09");
    expect(view.page).toBe(2);
  });

  it("keeps the saved day when the focused id matches nothing", () => {
    const view = viewOf({
      entries: [{ id: "a", measured_on: "2026-09-01T08:00:00" }],
      today,
      pageSize: 10,
      focusedEntryId: "missing",
      savedDay: "2026-09-01",
    });

    expect(view.day).toBe("2026-09");
    expect(view.page).toBe(1);
  });

  it("offers only today when there are no rows", () => {
    expect(
      viewOf({
        entries: [],
        today,
        pageSize: 10,
        focusedEntryId: null,
        savedDay: "2026-01-01",
      }),
    ).toEqual({ dates: ["2026-10"], day: "2026-10", page: 1 });
  });
});

describe("filterByMonth", () => {
  it("filters one calendar month without reordering or recomputing deltas", () => {
    const morningDelta = { direction: "up", difference: 0.4 };
    const eveningDelta = { direction: "down", difference: 1.5 };
    const olderDelta = { direction: "up", difference: 2 };
    const morning = { id: "morning", measured_on: "2026-10-06 07:00:00", deltas: morningDelta };
    const evening = { id: "evening", measured_on: "2026-10-06T19:00:00", deltas: eveningDelta };
    const older = { id: "older", measured_on: "2026-09-01T08:00:00", deltas: olderDelta };
    const input = [morning, evening, older];

    const filtered = filterByMonth(input, "2026-10");

    expect(filtered.map((entry) => entry.id)).toEqual(["morning", "evening"]);
    expect(filtered[0]).toBe(morning);
    expect(filtered[1]).toBe(evening);
    expect(filtered[0]?.deltas).toBe(morningDelta);
    expect(filtered[1]?.deltas).toBe(eveningDelta);
    expect(older.deltas).toBe(olderDelta);
    expect(input.map((entry) => entry.id)).toEqual(["morning", "evening", "older"]);
  });
});

describe("pageSlice", () => {
  it("takes page 1 from the start of a newest-first day", () => {
    const eveningDelta = { direction: "down", difference: 1.5 };
    const evening = { id: "evening", measured_on: "2026-10-06T19:00:00", deltas: eveningDelta };
    const morning = { id: "morning", measured_on: "2026-10-06T07:00:00", deltas: null };
    const older = { id: "older", measured_on: "2026-09-01T08:00:00", deltas: { direction: "up", difference: 2 } };
    const dayRows = filterByMonth([evening, morning, older], "2026-10");

    expect(pageSlice(dayRows, 1, 10).map((entry) => entry.id)).toEqual(["evening", "morning"]);
    expect(pageSlice(dayRows, 1, 5)[0]).toBe(evening);
    expect(pageSlice(dayRows, 1, 5)[0]?.deltas).toBe(eveningDelta);
  });

  it("keeps the remainder on the last page", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${String(index)}`,
      measured_on: `2026-09-02T12:${String(59 - index).padStart(2, "0")}:00`,
    }));
    const dayRows = filterByMonth(rows, "2026-09");

    expect(pageSlice(dayRows, 1, 5).map((entry) => entry.id)).toEqual(["row-0", "row-1", "row-2", "row-3", "row-4"]);
    expect(pageSlice(dayRows, 3, 5).map((entry) => entry.id)).toEqual(["row-10", "row-11"]);
    expect(pageSlice(dayRows, 3, 5)[0]).toBe(rows[10]);
  });

  it("uses the first slice below page 1 and the remainder past the last page", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ id: `row-${String(index)}` }));

    expect(pageSlice(rows, 0, 5).map((entry) => entry.id)).toEqual(["row-0", "row-1", "row-2", "row-3", "row-4"]);
    expect(pageSlice(rows, 4, 5).map((entry) => entry.id)).toEqual(["row-10", "row-11"]);
    expect(pageSlice([], 2, 10)).toEqual([]);
  });
});
