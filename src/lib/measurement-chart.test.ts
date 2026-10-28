import { describe, expect, it } from "vitest";

import {
  anchorWithEntries,
  CHART_SELECTION_LIMIT,
  bucketStartMs,
  chartDateTimeLabel,
  chartHeading,
  selectedChartHeading,
  chartFieldColor,
  chartKeyAnchor,
  chartPeriodKey,
  chartPeriodLabel,
  chartQueryAnchor,
  calendarWeek,
  compactChartPeriodLabel,
  chartTickLabel,
  chartTickStyle,
  lastYearsRange,
  linkPrevious,
  earlierPeriod,
  entryDays,
  isYearsRange,
  laterPeriod,
  latestPerBucket,
  chartPreferenceValue,
  maxTickLabels,
  parseChartPreference,
  thinTicks,
  periodsWithEntries,
  chartWindow,
  chartXDomain,
  limitSelection,
  measuredOnMs,
  monthAnchor,
  parseChartAnchor,
  parseChartPeriod,
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
  it("spans the whole Monday-to-Sunday week across a year boundary", () => {
    for (const day of ["2025-12-29", "2026-01-01", "2026-01-04"]) {
      expect(chartWindow("week", day, null)).toEqual({
        start: "2025-12-29T00:00:00",
        end: "2026-01-05T00:00:00",
      });
    }
  });

  it("spans the whole week across a month boundary", () => {
    expect(chartWindow("week", "2026-10-02", null)).toEqual({
      start: "2026-09-28T00:00:00",
      end: "2026-10-05T00:00:00",
    });
    expect(chartWindow("week", "2026-10-28", null)).toEqual({
      start: "2026-10-26T00:00:00",
      end: "2026-11-02T00:00:00",
    });
    expect(chartWindow("week", "2026-10-14", null)).toEqual({
      start: "2026-10-12T00:00:00",
      end: "2026-10-19T00:00:00",
    });
  });

  it("covers the anchor's month, including December", () => {
    expect(chartWindow("month", "2026-10-28", null)).toEqual({
      start: "2026-10-01T00:00:00",
      end: "2026-11-01T00:00:00",
    });
    expect(chartWindow("month", "2026-12-31", null)).toEqual({
      start: "2026-12-01T00:00:00",
      end: "2027-01-01T00:00:00",
    });
  });

  it("covers the anchor's calendar year", () => {
    expect(chartWindow("year", "2025-12-31", null)).toEqual({
      start: "2025-01-01T00:00:00",
      end: "2026-01-01T00:00:00",
    });
  });

  it("covers the chosen span of years", () => {
    expect(chartWindow("years", "2026-03-01", { from: 2024, to: 2026 })).toEqual({
      start: "2024-01-01T00:00:00",
      end: "2027-01-01T00:00:00",
    });
  });

  it("covers the anchor's year when years have no range", () => {
    expect(chartWindow("years", "2024-06-01", null)).toEqual({
      start: "2024-01-01T00:00:00",
      end: "2025-01-01T00:00:00",
    });
  });
});

describe("chartPeriodLabel", () => {
  it("names each period", () => {
    expect(chartPeriodLabel("week", "2026-10-14")).toBe("12 – 18 Oct 2026");
    expect(chartPeriodLabel("week", "2026-10-28")).toBe("26 Oct – 1 Nov 2026");
    expect(chartPeriodLabel("week", "2026-01-01")).toBe("29 Dec 2025 – 4 Jan 2026");
    expect(chartPeriodLabel("month", "2026-10-28")).toBe("October 2026");
    expect(chartPeriodLabel("year", "2026-10-28")).toBe("2026");
    expect(chartPeriodLabel("years", "2026-10-28")).toBe("Last 5 years");
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
    const points = Array.from({ length: 8 }, (_, index) => utc(2026, 10, 1 + index * 4, 8));
    expect(xTicks(points, october, "month")).toEqual(points);
  });

  it("counts distinct entries and sorts them", () => {
    const points = [utc(2026, 10, 9), utc(2026, 10, 2), utc(2026, 10, 9)];
    expect(xTicks(points, october, "month")).toEqual([utc(2026, 10, 2), utc(2026, 10, 9)]);
  });

  it("ticks Mondays instead of entries less than four days apart in a month", () => {
    const points = [utc(2026, 10, 2, 8), utc(2026, 10, 26, 8), utc(2026, 10, 28, 8)];
    expect(xTicks(points, october, "month")).toEqual([
      utc(2026, 10, 5),
      utc(2026, 10, 12),
      utc(2026, 10, 19),
      utc(2026, 10, 26),
    ]);
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

  it("ticks every month of a year even with few entries", () => {
    const year = { start: "2026-01-01T00:00:00", end: "2027-01-01T00:00:00" };
    expect(xTicks([utc(2026, 3, 10)], year, "year")).toEqual(
      Array.from({ length: 12 }, (_, index) => utc(2026, index + 1, 1)),
    );
  });

  it("ticks January 1 of each year in a span of years", () => {
    const years = { start: "2024-01-01T00:00:00", end: "2027-01-01T00:00:00" };
    expect(xTicks([utc(2025, 3, 10)], years, "years")).toEqual([utc(2024, 1, 1), utc(2025, 1, 1), utc(2026, 1, 1)]);
    const many = Array.from({ length: 9 }, (_, index) => utc(2025, index + 1, 10));
    expect(xTicks(many, years, "years")).toEqual([utc(2024, 1, 1), utc(2025, 1, 1), utc(2026, 1, 1)]);
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

describe("chartFieldColor", () => {
  it("gives each field its own token in field order", () => {
    expect(chartFieldColor("weight_kg")).toBe("var(--chart-1)");
    expect(chartFieldColor("chest_cm")).toBe("var(--chart-2)");
    expect(chartFieldColor("navel_cm")).toBe("var(--chart-8)");
  });
});

describe("chartTickLabel", () => {
  it("labels a tick by its style in UTC", () => {
    expect(chartTickLabel(utc(2026, 10, 5, 23), "day")).toBe("5 Oct");
    expect(chartTickLabel(utc(2026, 1, 31), "day-year")).toBe("31 Jan 2026");
    expect(chartTickLabel(utc(2026, 1, 1), "month")).toBe("Jan");
    expect(chartTickLabel(utc(2025, 1, 1), "year")).toBe("2025");
  });
});

describe("chartTickStyle", () => {
  it("uses months for a year, years for a span, and days otherwise", () => {
    expect(chartTickStyle("week", false)).toBe("day");
    expect(chartTickStyle("month", false)).toBe("day");
    expect(chartTickStyle("year", false)).toBe("month");
    expect(chartTickStyle("years", false)).toBe("year");
    expect(chartTickStyle("selected", false)).toBe("day");
    expect(chartTickStyle("selected", true)).toBe("day-year");
  });
});

describe("isYearsRange", () => {
  it("accepts up to five calendar years in order", () => {
    expect(isYearsRange(2022, 2026)).toBe(true);
    expect(isYearsRange(2026, 2026)).toBe(true);
    expect(isYearsRange(2021, 2026)).toBe(false);
    expect(isYearsRange(2026, 2025)).toBe(false);
  });
});

describe("lastYearsRange", () => {
  it("covers this year and the four before it", () => {
    expect(lastYearsRange(today)).toEqual({ from: 2022, to: 2026 });
  });
});

describe("parseChartPreference", () => {
  it("reads the period and the remembered anchor", () => {
    expect(parseChartPreference("week|2026-10-26")).toEqual({ period: "week", anchor: "2026-10-26" });
    expect(parseChartPreference("years|2026-10-28")).toEqual({ period: "years", anchor: "2026-10-28" });
  });

  it("reads older values without an anchor", () => {
    expect(parseChartPreference("week")).toEqual({ period: "week", anchor: null });
    expect(parseChartPreference("years|2023-2026")).toEqual({ period: "years", anchor: null });
    expect(parseChartPreference("month|2026-02-30")).toEqual({ period: "month", anchor: null });
    expect(parseChartPreference("nope")).toEqual({ period: "month", anchor: null });
    expect(parseChartPreference(null)).toEqual({ period: "month", anchor: null });
  });

  it("round-trips through the stored value", () => {
    const preference = { period: "year", anchor: "2025-01-01" } as const;
    expect(parseChartPreference(chartPreferenceValue(preference))).toEqual(preference);
    expect(chartPreferenceValue({ period: "week", anchor: null })).toBe("week");
  });
});

describe("thinTicks", () => {
  const months = Array.from({ length: 12 }, (_, index) => index);

  it("keeps every second of 12 ticks for 6 labels", () => {
    expect(thinTicks(months, 6)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("keeps every third of 12 ticks for 4 labels", () => {
    expect(thinTicks(months, 4)).toEqual([0, 3, 6, 9]);
  });

  it("never keeps more labels than fit when the count does not divide evenly", () => {
    expect(thinTicks(months, 5)).toEqual([0, 3, 6, 9]);
    expect(thinTicks(months, 7)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("keeps the ticks that already fit, and an empty list", () => {
    expect(thinTicks(months, 12)).toEqual(months);
    expect(thinTicks([1, 2], 5)).toEqual([1, 2]);
    expect(thinTicks([], 3)).toEqual([]);
  });
});

describe("maxTickLabels", () => {
  it("fits labels by their style across the plot", () => {
    expect(maxTickLabels(240, "month")).toBe(7);
    expect(maxTickLabels(240, "day")).toBe(4);
    expect(maxTickLabels(240, "year")).toBe(6);
    expect(maxTickLabels(10, "day-year")).toBe(1);
  });
});

describe("periods with entries", () => {
  const days = entryDays(["2026-10-28T07:00:00", "2026-10-27 07:00", "2026-10-28T19:00:00", "2025-12-31T08:00:00"]);

  it("lists distinct entry days oldest first", () => {
    expect(days).toEqual(["2025-12-31", "2026-10-27", "2026-10-28"]);
  });

  it("keys weeks by Monday, months by month and years by year", () => {
    expect(periodsWithEntries("week", days)).toEqual(["2025-12-29", "2026-10-26"]);
    expect(periodsWithEntries("month", days)).toEqual(["2025-12", "2026-10"]);
    expect(periodsWithEntries("year", days)).toEqual(["2025", "2026"]);
  });

  it("maps a key back to an anchor day", () => {
    expect(chartPeriodKey("week", "2026-10-28")).toBe("2026-10-26");
    expect(chartKeyAnchor("week", "2026-10-26", today)).toBe("2026-10-26");
    expect(chartKeyAnchor("month", "2026-10", today)).toBe(today);
    expect(chartKeyAnchor("month", "2025-12", today)).toBe("2025-12-01");
    expect(chartKeyAnchor("year", "2026", today)).toBe(today);
    expect(chartKeyAnchor("year", "2025", today)).toBe("2025-01-01");
  });

  it("steps to the nearest period with entries, or null at the ends", () => {
    const months = ["2025-12", "2026-10"];
    expect(earlierPeriod("2026-10", months)).toBe("2025-12");
    expect(earlierPeriod("2026-03", months)).toBe("2025-12");
    expect(earlierPeriod("2025-12", months)).toBeNull();
    expect(laterPeriod("2026-03", months)).toBe("2026-10");
    expect(laterPeriod("2026-10", months)).toBeNull();
  });
});

describe("chartXDomain", () => {
  it("pads a month by half a day around its first and last day", () => {
    const october = { start: "2026-10-01T00:00:00", end: "2026-11-01T00:00:00" };
    expect(chartXDomain([utc(2026, 10, 5)], october, [], "month")).toEqual([
      utc(2026, 10, 1) - DAY / 2,
      utc(2026, 10, 31) + DAY / 2,
    ]);
  });

  it("pads a year by half a month around January and December", () => {
    const year = { start: "2026-01-01T00:00:00", end: "2027-01-01T00:00:00" };
    expect(chartXDomain([utc(2026, 3, 1)], year, [], "year")).toEqual([
      utc(2026, 1, 1) - (31 * DAY) / 2,
      utc(2026, 12, 1) + (31 * DAY) / 2,
    ]);
  });

  it("pads a span of years by half a year around its first and last January", () => {
    const years = { start: "2022-01-01T00:00:00", end: "2027-01-01T00:00:00" };
    expect(chartXDomain([utc(2024, 1, 1)], years, [], "years")).toEqual([
      utc(2022, 1, 1) - (365 * DAY) / 2,
      utc(2026, 1, 1) + (365 * DAY) / 2,
    ]);
  });

  it("spans the selected points and ticks", () => {
    expect(chartXDomain([utc(2026, 10, 2, 8), utc(2026, 10, 9, 8)], null, [utc(2026, 9, 28)], "selected")).toEqual([
      utc(2026, 9, 28),
      utc(2026, 10, 9, 8),
    ]);
  });

  it("pads a single selected point by half a day each side", () => {
    const point = utc(2026, 10, 2, 12);
    expect(chartXDomain([point], null, [point], "selected")).toEqual([point - DAY / 2, point + DAY / 2]);
  });

  it("returns null without points", () => {
    expect(chartXDomain([], null, [], "selected")).toBeNull();
  });
});

describe("bucketStartMs", () => {
  it("moves a point to the UTC start of its day, month or year", () => {
    const point = utc(2026, 10, 28, 18) + 30 * 60 * 1000;
    expect(bucketStartMs(point, "week")).toBe(utc(2026, 10, 28));
    expect(bucketStartMs(point, "month")).toBe(utc(2026, 10, 28));
    expect(bucketStartMs(point, "year")).toBe(utc(2026, 10, 1));
    expect(bucketStartMs(point, "years")).toBe(utc(2026, 1, 1));
  });
});

describe("compactChartPeriodLabel", () => {
  it("drops the year from a week", () => {
    expect(compactChartPeriodLabel("week", "2026-10-14")).toBe("12 – 18 Oct");
    expect(compactChartPeriodLabel("week", "2026-10-02")).toBe("28 Sep – 4 Oct");
    expect(compactChartPeriodLabel("week", "2025-12-30")).toBe("29 Dec – 4 Jan");
  });

  it("keeps the other labels", () => {
    expect(compactChartPeriodLabel("month", "2026-10-28")).toBe("October 2026");
    expect(compactChartPeriodLabel("year", "2026-10-28")).toBe("2026");
    expect(compactChartPeriodLabel("years", "2026-10-28")).toBe("Last 5 years");
  });
});

describe("chartDateTimeLabel", () => {
  it("shows the wall-clock date and time", () => {
    expect(chartDateTimeLabel("2026-10-25T08:00:00")).toBe("25 Oct 2026, 08:00");
    expect(chartDateTimeLabel("2024-01-28 19:05")).toBe("28 Jan 2024, 19:05");
  });
});

describe("linkPrevious", () => {
  it("compares each entry to the one before it and the first to the older entry", () => {
    const linked = linkPrevious(
      [{ measured_on: "2026-10-26T07:00:00" }, { measured_on: "2026-10-27T07:00:00" }],
      "2026-10-20T07:00:00",
    );
    expect(linked.map((entry) => entry.previous_measured_on)).toEqual(["2026-10-20T07:00:00", "2026-10-26T07:00:00"]);
    expect(linkPrevious([{ measured_on: "2026-10-26T07:00:00" }], null)[0].previous_measured_on).toBeNull();
  });
});

describe("latestPerBucket", () => {
  function entry(id: string, measuredOn: string) {
    return { id, measured_on: measuredOn };
  }

  const entries = [
    entry("a", "2025-12-31T08:00:00"),
    entry("b", "2026-10-26T07:00:00"),
    entry("c", "2026-10-26 19:30"),
    entry("d", "2026-10-27T06:00:00"),
    entry("e", "2026-11-02T06:00:00"),
  ];

  it("keeps the latest entry of each day for a week or a month, in order", () => {
    expect(latestPerBucket(entries, "week").map((item) => item.id)).toEqual(["a", "c", "d", "e"]);
    expect(latestPerBucket(entries, "month").map((item) => item.id)).toEqual(["a", "c", "d", "e"]);
  });

  it("keeps the latest entry of each month for a year", () => {
    expect(latestPerBucket(entries, "year").map((item) => item.id)).toEqual(["a", "d", "e"]);
  });

  it("keeps the latest entry of each year for a span of years", () => {
    expect(latestPerBucket(entries, "years").map((item) => item.id)).toEqual(["a", "e"]);
  });

  it("gives a tie to the later entry in the given order", () => {
    const tied = [entry("x", "2026-10-26T07:00:00"), entry("y", "2026-10-26T07:00:00")];
    expect(latestPerBucket(tied, "month").map((item) => item.id)).toEqual(["y"]);
  });
});

describe("chartHeading", () => {
  it("names each period and what it plots", () => {
    expect(chartHeading("week")).toEqual({ title: "Weekly progression", note: "Shows the last entry of each day" });
    expect(chartHeading("month")).toEqual({ title: "Monthly progression", note: "Shows the last entry of each day" });
    expect(chartHeading("year")).toEqual({ title: "Year progression", note: "Shows the last entry of each month" });
    expect(chartHeading("years")).toEqual({
      title: "Progress over the past 5 years",
      note: "Shows the last entry of each year",
    });
  });

  it("counts selected entries without a note", () => {
    expect(selectedChartHeading(3)).toEqual({ title: "Selected entries (3)", note: null });
  });
});

describe("calendarWeek", () => {
  it("returns the Monday-to-Sunday week, crossing months", () => {
    expect(calendarWeek("2026-10-01")).toEqual({ first: "2026-09-28", last: "2026-10-04" });
    expect(calendarWeek("2026-10-31")).toEqual({ first: "2026-10-26", last: "2026-11-01" });
  });

  it("keys and lists calendar weeks by their Monday", () => {
    expect(chartPeriodKey("week", "2026-01-03")).toBe("2025-12-29");
    expect(periodsWithEntries("week", ["2025-12-30", "2026-01-02", "2026-01-05"])).toEqual([
      "2025-12-29",
      "2026-01-05",
    ]);
  });
});

describe("chartQueryAnchor", () => {
  it("sends the first day of the week, month or year", () => {
    expect(chartQueryAnchor("week", "2026-10-28")).toBe("2026-10-26");
    expect(chartQueryAnchor("month", "2026-10-28")).toBe("2026-10-01");
    expect(chartQueryAnchor("year", "2026-10-28")).toBe("2026-01-01");
  });
});

describe("anchorWithEntries", () => {
  const days = ["2025-09-17", "2025-11-03", "2026-10-20"];

  it("moves into the latest entry of the period on screen when the new one is empty", () => {
    expect(anchorWithEntries("year", "week", "2025-01-01", days)).toBe("2025-11-03");
    expect(anchorWithEntries("month", "week", "2025-09-01", days)).toBe("2025-09-17");
  });

  it("keeps an anchor whose new period holds an entry", () => {
    expect(anchorWithEntries("week", "year", "2025-09-17", days)).toBe("2025-09-17");
    expect(anchorWithEntries("year", "month", "2025-11-10", days)).toBe("2025-11-10");
  });

  it("falls back to the latest entry, and leaves Years or no entries alone", () => {
    expect(anchorWithEntries("years", "month", "2026-01-01", days)).toBe("2026-10-20");
    expect(anchorWithEntries("year", "month", "2024-01-01", days)).toBe("2026-10-20");
    expect(anchorWithEntries("month", "years", "2025-01-01", days)).toBe("2025-01-01");
    expect(anchorWithEntries("year", "week", "2025-01-01", [])).toBe("2025-01-01");
  });
});
