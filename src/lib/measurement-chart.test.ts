import { describe, expect, it } from "vitest";

import {
  CHART_SELECTION_LIMIT,
  chartPeriodLabel,
  chartWindow,
  limitSelection,
  measuredOnMs,
  monthAnchor,
  parseChartAnchor,
  parseChartPeriod,
  reconcileSelection,
  stepAnchor,
  xTicks,
  yAxis,
} from "@/lib/measurement-chart";

const today = "2026-10-28";
const DAY = 24 * 60 * 60 * 1000;

function utc(year: number, month: number, day: number, hour = 0): number {
  return Date.UTC(year, month - 1, day, hour);
}

describe("parseChartPeriod", () => {
  it("keeps the four periods and falls back to month", () => {
    expect(parseChartPeriod("week")).toBe("week");
    expect(parseChartPeriod("month")).toBe("month");
    expect(parseChartPeriod("year")).toBe("year");
    expect(parseChartPeriod("years")).toBe("years");
    expect(parseChartPeriod("day")).toBe("month");
    expect(parseChartPeriod(null)).toBe("month");
    expect(parseChartPeriod(7)).toBe("month");
  });
});

describe("parseChartAnchor", () => {
  it("keeps a real calendar day and rejects anything else", () => {
    expect(parseChartAnchor("2026-10-28")).toBe("2026-10-28");
    expect(parseChartAnchor("2024-02-29")).toBe("2024-02-29");
    expect(parseChartAnchor("2026-02-29")).toBeNull();
    expect(parseChartAnchor("2026-13-01")).toBeNull();
    expect(parseChartAnchor("2026-10")).toBeNull();
    expect(parseChartAnchor(null)).toBeNull();
  });
});

describe("chartWindow", () => {
  it("covers the Monday-first week across a month and a year boundary", () => {
    expect(chartWindow("week", "2026-01-01", null, today)).toEqual({
      start: "2025-12-29T00:00:00",
      end: "2026-01-05T00:00:00",
    });
    expect(chartWindow("week", "2025-12-29", null, today)).toEqual({
      start: "2025-12-29T00:00:00",
      end: "2026-01-05T00:00:00",
    });
    expect(chartWindow("week", "2026-01-04", null, today)).toEqual({
      start: "2025-12-29T00:00:00",
      end: "2026-01-05T00:00:00",
    });
  });

  it("covers the anchor's month, including December", () => {
    expect(chartWindow("month", "2026-10-28", null, today)).toEqual({
      start: "2026-10-01T00:00:00",
      end: "2026-11-01T00:00:00",
    });
    expect(chartWindow("month", "2026-12-31", null, today)).toEqual({
      start: "2026-12-01T00:00:00",
      end: "2027-01-01T00:00:00",
    });
  });

  it("covers the anchor's calendar year", () => {
    expect(chartWindow("year", "2025-12-31", null, today)).toEqual({
      start: "2025-01-01T00:00:00",
      end: "2026-01-01T00:00:00",
    });
  });

  it("covers every year from the earliest data to this year", () => {
    expect(chartWindow("years", "2026-03-01", "2024-01", today)).toEqual({
      start: "2024-01-01T00:00:00",
      end: "2027-01-01T00:00:00",
    });
  });

  it("covers only this year when there is no data", () => {
    expect(chartWindow("years", "2024-06-01", null, today)).toEqual({
      start: "2026-01-01T00:00:00",
      end: "2027-01-01T00:00:00",
    });
  });
});

describe("stepAnchor", () => {
  it("steps a week by seven days", () => {
    expect(stepAnchor("week", "2026-10-28", 1)).toBe("2026-11-04");
    expect(stepAnchor("week", "2026-01-01", -1)).toBe("2025-12-25");
  });

  it("keeps the anchor a valid day at month ends", () => {
    expect(stepAnchor("month", "2026-01-31", 1)).toBe("2026-02-28");
    expect(stepAnchor("month", "2026-03-31", -1)).toBe("2026-02-28");
    expect(stepAnchor("month", "2026-12-15", 1)).toBe("2027-01-15");
    expect(stepAnchor("month", "2026-01-15", -1)).toBe("2025-12-15");
  });

  it("steps a year and keeps a leap day valid", () => {
    expect(stepAnchor("year", "2026-10-28", 1)).toBe("2027-10-28");
    expect(stepAnchor("year", "2024-02-29", 1)).toBe("2025-02-28");
  });

  it("does not step all years", () => {
    expect(stepAnchor("years", "2026-10-28", 1)).toBe("2026-10-28");
    expect(stepAnchor("years", "2026-10-28", -1)).toBe("2026-10-28");
  });
});

describe("chartPeriodLabel", () => {
  it("names each period", () => {
    expect(chartPeriodLabel("week", "2026-10-28")).toBe("26 Oct – 1 Nov 2026");
    expect(chartPeriodLabel("week", "2026-01-01")).toBe("29 Dec 2025 – 4 Jan 2026");
    expect(chartPeriodLabel("month", "2026-10-28")).toBe("October 2026");
    expect(chartPeriodLabel("year", "2026-10-28")).toBe("2026");
    expect(chartPeriodLabel("years", "2026-10-28")).toBe("All years");
  });
});

describe("monthAnchor", () => {
  it("anchors today's month on today and any other month on its first day", () => {
    expect(monthAnchor("2026-10", today)).toBe(today);
    expect(monthAnchor("2026-06", today)).toBe("2026-06-01");
  });
});

describe("yAxis", () => {
  it("rounds out to multiples of 5 with one step of padding", () => {
    expect(yAxis([70.0, 71.2, 72.4], "weight_kg")).toEqual({ domain: [65, 80], ticks: [65, 70, 75, 80] });
  });

  it("clamps the lower bound to the field's minimum", () => {
    expect(yAxis([21], "weight_kg")?.domain[0]).toBe(20);
    expect(yAxis([11], "waist_cm")?.domain[0]).toBe(10);
  });

  it("clamps the upper bound to the field's maximum", () => {
    expect(yAxis([299], "navel_cm")?.domain[1]).toBe(300);
    expect(yAxis([399.5], "weight_kg")?.domain[1]).toBe(400);
  });

  it("ticks every 5 from bound to bound", () => {
    const axis = yAxis([50, 62.3], "chest_cm");
    expect(axis).toEqual({ domain: [45, 70], ticks: [45, 50, 55, 60, 65, 70] });
  });

  it("returns null with no values", () => {
    expect(yAxis([], "weight_kg")).toBeNull();
  });
});

describe("measuredOnMs", () => {
  it("parses wall-clock time as UTC", () => {
    expect(measuredOnMs("2026-10-28T07:30:00")).toBe(Date.UTC(2026, 9, 28, 7, 30));
    expect(measuredOnMs("2026-10-28 07:30")).toBe(Date.UTC(2026, 9, 28, 7, 30));
    expect(measuredOnMs("2026-10-28")).toBe(Date.UTC(2026, 9, 28));
    expect(Number.isNaN(measuredOnMs("nope"))).toBe(true);
  });

  it("keeps exact 24 hour steps across daylight saving changes", () => {
    expect(measuredOnMs("2026-03-29T08:00:00") - measuredOnMs("2026-03-28T08:00:00")).toBe(DAY);
    expect(measuredOnMs("2026-10-25T08:00:00") - measuredOnMs("2026-10-24T08:00:00")).toBe(DAY);
    expect(measuredOnMs("2026-03-08 08:00") - measuredOnMs("2026-03-07 08:00")).toBe(DAY);
  });
});

describe("xTicks", () => {
  const october = { start: "2026-10-01T00:00:00", end: "2026-11-01T00:00:00" };

  it("puts one tick on each entry when there are 8 or fewer", () => {
    const points = Array.from({ length: 8 }, (_, index) => utc(2026, 10, 1 + index * 3, 8));
    expect(xTicks(points, october, "month")).toEqual(points);
  });

  it("counts distinct entries and sorts them", () => {
    const points = [utc(2026, 10, 5), utc(2026, 10, 2), utc(2026, 10, 5)];
    expect(xTicks(points, october, "month")).toEqual([utc(2026, 10, 2), utc(2026, 10, 5)]);
  });

  it("ticks every Monday of the month past 8 entries", () => {
    const points = Array.from({ length: 9 }, (_, index) => utc(2026, 10, 1 + index * 3, 8));
    expect(xTicks(points, october, "month")).toEqual([
      utc(2026, 10, 5),
      utc(2026, 10, 12),
      utc(2026, 10, 19),
      utc(2026, 10, 26),
    ]);
  });

  it("ticks every day of the week past 8 entries", () => {
    const week = { start: "2026-10-26T00:00:00", end: "2026-11-02T00:00:00" };
    const points = Array.from({ length: 9 }, (_, index) => utc(2026, 10, 26, 0) + index * 12 * 60 * 60 * 1000);
    expect(xTicks(points, week, "week")).toEqual(Array.from({ length: 7 }, (_, index) => utc(2026, 10, 26 + index)));
  });

  it("ticks the first of each month of a year", () => {
    const year = { start: "2026-01-01T00:00:00", end: "2027-01-01T00:00:00" };
    const points = Array.from({ length: 12 }, (_, index) => utc(2026, index + 1, 10));
    expect(xTicks(points, year, "year")).toEqual(Array.from({ length: 12 }, (_, index) => utc(2026, index + 1, 1)));
  });

  it("ticks the first of each month across all years", () => {
    const years = { start: "2025-01-01T00:00:00", end: "2027-01-01T00:00:00" };
    const points = Array.from({ length: 9 }, (_, index) => utc(2025, index + 1, 10));
    expect(xTicks(points, years, "years")).toHaveLength(24);
  });

  it("ticks selected entries per day over a span of up to 7 days", () => {
    const first = utc(2026, 10, 1, 8);
    const points = Array.from({ length: 9 }, (_, index) => first + index * 9 * 60 * 60 * 1000);
    expect(points[8] - first).toBe(3 * DAY);
    expect(xTicks(points, null, "selected")).toEqual([
      utc(2026, 10, 1),
      utc(2026, 10, 2),
      utc(2026, 10, 3),
      utc(2026, 10, 4),
    ]);
  });

  it("ticks selected entries per Monday over a span of up to 31 days", () => {
    const first = utc(2026, 10, 1, 8);
    const points = Array.from({ length: 11 }, (_, index) => first + index * 2 * DAY);
    expect(points[10] - first).toBe(20 * DAY);
    expect(xTicks(points, null, "selected")).toEqual([
      utc(2026, 9, 28),
      utc(2026, 10, 5),
      utc(2026, 10, 12),
      utc(2026, 10, 19),
    ]);
  });

  it("ticks selected entries per month over a longer span", () => {
    const first = utc(2026, 1, 15, 8);
    const points = Array.from({ length: 11 }, (_, index) => first + index * 20 * DAY);
    expect(points[10] - first).toBe(200 * DAY);
    expect(xTicks(points, null, "selected")).toEqual(Array.from({ length: 8 }, (_, index) => utc(2026, index + 1, 1)));
  });
});

describe("limitSelection", () => {
  const ids = Array.from({ length: 20 }, (_, index) => `id-${String(index).padStart(2, "0")}`);

  it("stops at the limit and keeps the order", () => {
    const selection = limitSelection(ids.slice(0, 10), ids.slice(10), CHART_SELECTION_LIMIT);
    expect(CHART_SELECTION_LIMIT).toBe(15);
    expect(selection).toEqual(ids.slice(0, 15));
  });

  it("does not duplicate ids that are already selected", () => {
    expect(limitSelection(["a", "b"], ["b", "c", "a"], CHART_SELECTION_LIMIT)).toEqual(["a", "b", "c"]);
  });

  it("adds nothing once the selection is full", () => {
    const full = ids.slice(0, 15);
    expect(limitSelection(full, ["new"], CHART_SELECTION_LIMIT)).toEqual(full);
  });
});

describe("reconcileSelection", () => {
  it("drops ids that were not found and keeps the order", () => {
    expect(reconcileSelection(["c", "a", "b", "d"], ["a", "c", "d"])).toEqual(["c", "a", "d"]);
    expect(reconcileSelection(["a"], [])).toEqual([]);
  });
});
