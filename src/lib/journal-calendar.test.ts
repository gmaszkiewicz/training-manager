import { describe, expect, it } from "vitest";

import {
  listMonthChange,
  monthGrid,
  monthLabel,
  openingDay,
  weekContaining,
  widestMonthLabel,
} from "@/lib/journal-calendar";

const weekOf11October = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-10",
  "2026-10-11",
];

describe("weekContaining", () => {
  it("returns Monday 5 October through Sunday 11 October 2026", () => {
    expect(weekContaining("2026-10-11")).toEqual(weekOf11October);
    expect(weekContaining("2026-10-05")).toEqual(weekOf11October);
  });
});

describe("monthGrid", () => {
  it("covers October 2026 from 28 September through 1 November", () => {
    const grid = monthGrid("2026-10");

    expect(grid[0]).toBe("2026-09-28");
    expect(grid[grid.length - 1]).toBe("2026-11-01");
    expect(grid).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
});

describe("monthLabel", () => {
  it("uses a fixed English month name", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
  });
});

describe("widestMonthLabel", () => {
  it("uses September and the year so the month control stays one width", () => {
    expect(widestMonthLabel("2026-05")).toBe("September 2026");
    expect(widestMonthLabel("2025-09")).toBe("September 2025");
  });
});

describe("openingDay", () => {
  it("returns today when today falls in the month", () => {
    expect(openingDay("2026-10", "2026-10-11", null)).toBe("2026-10-11");
  });

  it("returns the calendar day of the newest measurement", () => {
    expect(openingDay("2026-09", "2026-10-11", "2026-09-28T18:00:00")).toBe("2026-09-28");
    expect(openingDay("2026-09", "2026-10-11", "2026-09-28 18:00:00")).toBe("2026-09-28");
  });

  it("returns the 1st when the month has no measurement", () => {
    expect(openingDay("2026-09", "2026-10-11", null)).toBe("2026-09-01");
  });
});

describe("listMonthChange", () => {
  const knownMonths = ["2026-09", "2026-10"];

  it("returns null for a day in the loaded month", () => {
    expect(listMonthChange("2026-10", "2026-10-07", knownMonths)).toBeNull();
  });

  it("returns a known month that differs from the loaded month", () => {
    expect(listMonthChange("2026-10", "2026-09-28", knownMonths)).toBe("2026-09");
  });

  it("returns null when the day's month is not in the known list", () => {
    expect(listMonthChange("2026-10", "2026-08-31", knownMonths)).toBeNull();
  });
});
