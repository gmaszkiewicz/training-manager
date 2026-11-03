import { describe, expect, it } from "vitest";

import { chartWindow, lastYearsRange } from "@/lib/measurement-chart";
import {
  circumferenceFields,
  labelMonthDays,
  subPeriodTotals,
  topChangeScale,
  topSubPeriod,
  type SubPeriodRow,
} from "@/lib/measurement-top-changes";
import type { ChartMeasurement, FieldDelta, MeasurementField } from "@/types";

const none: FieldDelta = { direction: "none", difference: 0 };

function up(difference: number): FieldDelta {
  return { direction: "up", difference };
}

function down(difference: number): FieldDelta {
  return { direction: "down", difference };
}

function entry(
  id: string,
  measuredOn: string,
  previousMeasuredOn: string | null,
  deltas: Partial<Record<MeasurementField, FieldDelta>> | null,
): ChartMeasurement {
  return {
    id,
    measured_on: measuredOn,
    previous_measured_on: previousMeasuredOn,
    created_at: "2026-01-01T00:00:00.000Z",
    weight_kg: 80,
    chest_cm: 100,
    waist_cm: 80,
    arms_cm: 35,
    thigh_cm: 55,
    calf_cm: 38,
    hips_cm: 95,
    navel_cm: 85,
    note: null,
    deltas:
      deltas === null
        ? null
        : {
            weight_kg: none,
            chest_cm: none,
            waist_cm: none,
            arms_cm: none,
            thigh_cm: none,
            calf_cm: none,
            hips_cm: none,
            navel_cm: none,
            ...deltas,
          },
  };
}

const years = lastYearsRange("2026-11-01");

function windowOf(period: "week" | "month" | "year" | "years", anchor: string) {
  return chartWindow(period, anchor, years);
}

function differences(rows: readonly SubPeriodRow[], field: MeasurementField): number[] {
  return rows.map((row) => row.values[field]?.difference ?? Number.NaN);
}

// November window: Oct 28 = 80.0 (before the window), Nov 3 = 81.5, Nov 20 = 81.0 kg.
const november = [
  entry("nov-3", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { weight_kg: up(1.5) }),
  entry("nov-20", "2026-11-20T08:00:00", "2026-11-03T08:00:00", { weight_kg: down(0.5) }),
];

describe("circumferenceFields", () => {
  it("lists the 7 fields after weight in field order", () => {
    expect(circumferenceFields).toEqual([
      "chest_cm",
      "waist_cm",
      "arms_cm",
      "thigh_cm",
      "calf_cm",
      "hips_cm",
      "navel_cm",
    ]);
  });
});

describe("subPeriodTotals axes", () => {
  it("has the 7 dates of a week", () => {
    const rows = subPeriodTotals([], ["weight_kg"], "week", windowOf("week", "2026-11-04"), "up");

    expect(rows.map((row) => row.key)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(rows.map((row) => row.axisLabel)).toEqual(["Mon 2", "Tue 3", "Wed 4", "Thu 5", "Fri 6", "Sat 7", "Sun 8"]);
    expect(rows[1]?.label).toBe("Tue 3 Nov");
  });

  it("crosses a month in a week", () => {
    const rows = subPeriodTotals([], ["weight_kg"], "week", windowOf("week", "2026-11-01"), "up");

    expect(rows[0]?.key).toBe("2026-10-26");
    expect(rows[0]?.label).toBe("Mon 26 Oct");
    expect(rows[6]?.key).toBe("2026-11-01");
  });

  it("has the calendar weeks of a month, clipped to the month", () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const rows = subPeriodTotals([], ["weight_kg"], "month", windowOf("month", "2026-11-04"), "up");

    expect(rows.map((row) => row.key)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
    ]);
    expect(rows.map((row) => row.axisLabel)).toEqual([
      "1 Nov",
      "2–8 Nov",
      "9–15 Nov",
      "16–22 Nov",
      "23–29 Nov",
      "30 Nov",
    ]);
    expect(rows[1]?.label).toBe("2–8 Nov");
  });

  it("has a month's mid-week start as a clipped first week", () => {
    // October 2026 starts on a Thursday.
    const rows = subPeriodTotals([], ["weight_kg"], "month", windowOf("month", "2026-10-15"), "up");

    expect(rows.map((row) => row.axisLabel)).toEqual(["1–4 Oct", "5–11 Oct", "12–18 Oct", "19–25 Oct", "26–31 Oct"]);
    // February 2027 starts on a Monday and has exactly 4 weeks.
    expect(subPeriodTotals([], ["weight_kg"], "month", windowOf("month", "2027-02-10"), "up")).toHaveLength(4);
  });

  it("has the 12 months of a year", () => {
    const rows = subPeriodTotals([], ["weight_kg"], "year", windowOf("year", "2026-11-04"), "up");

    expect(rows.map((row) => row.key)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
    expect(rows[2]?.axisLabel).toBe("Mar");
    expect(rows[2]?.label).toBe("March");
  });

  it("has the 5 years of a span", () => {
    const rows = subPeriodTotals([], ["weight_kg"], "years", windowOf("years", "2026-11-04"), "up");

    expect(rows.map((row) => row.key)).toEqual(["2022", "2023", "2024", "2025", "2026"]);
    expect(rows[4]?.axisLabel).toBe("2026");
    expect(rows[4]?.label).toBe("2026");
  });
});

describe("subPeriodTotals values", () => {
  it("sums each field per sub-period and fills the rest with 0", () => {
    const entries = [
      entry("mar-2", "2026-03-02T08:00:00", "2026-02-20T08:00:00", { thigh_cm: up(1) }),
      entry("mar-20", "2026-03-20T08:00:00", "2026-03-02T08:00:00", { thigh_cm: up(1), chest_cm: up(0.5) }),
      entry("may-2", "2026-05-02T08:00:00", "2026-03-20T08:00:00", { chest_cm: up(1) }),
    ];
    const rows = subPeriodTotals(entries, ["chest_cm", "thigh_cm"], "year", windowOf("year", "2026-06-01"), "up");

    expect(rows[2]?.values).toEqual({ chest_cm: { difference: 0.5, count: 1 }, thigh_cm: { difference: 2, count: 2 } });
    expect(rows[4]?.values).toEqual({ chest_cm: { difference: 1, count: 1 }, thigh_cm: { difference: 0, count: 0 } });
    expect(differences(rows, "thigh_cm")).toEqual([0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("returns only the requested fields", () => {
    const entries = [entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { weight_kg: up(1), waist_cm: up(2) })];
    const rows = subPeriodTotals(entries, ["waist_cm"], "week", windowOf("week", "2026-11-03"), "up");

    expect(Object.keys(rows[1]?.values ?? {})).toEqual(["waist_cm"]);
  });

  it("sums a month's entries into their calendar week", () => {
    const window = windowOf("month", "2026-11-04");
    const gains = subPeriodTotals(november, ["weight_kg"], "month", window, "up");
    const losses = subPeriodTotals(november, ["weight_kg"], "month", window, "down");

    expect(differences(gains, "weight_kg")).toEqual([0, 1.5, 0, 0, 0, 0]);
    expect(differences(losses, "weight_kg")).toEqual([0, 0, 0, 0.5, 0, 0]);
  });

  it("sums gains and drops separately", () => {
    const entries = [
      entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { waist_cm: up(1) }),
      entry("b", "2026-11-04T08:00:00", "2026-11-03T08:00:00", { waist_cm: down(1) }),
    ];
    const window = windowOf("month", "2026-11-04");

    expect(subPeriodTotals(entries, ["waist_cm"], "month", window, "up")[1]?.values.waist_cm).toEqual({
      difference: 1,
      count: 1,
    });
    expect(subPeriodTotals(entries, ["waist_cm"], "month", window, "down")[1]?.values.waist_cm).toEqual({
      difference: 1,
      count: 1,
    });
  });

  it("skips a first-ever entry with no deltas, unchanged fields and entries outside the window", () => {
    const entries = [
      entry("first", "2026-11-02T08:00:00", null, null),
      entry("same", "2026-11-03T08:00:00", "2026-11-02T08:00:00", { chest_cm: none }),
      entry("before", "2026-10-30T08:00:00", "2026-10-20T08:00:00", { chest_cm: up(3) }),
    ];
    const rows = subPeriodTotals(entries, ["chest_cm"], "week", windowOf("week", "2026-11-04"), "up");

    expect(rows.every((row) => row.values.chest_cm?.count === 0)).toBe(true);
  });

  it("rounds the sums to drop float drift", () => {
    const entries = [
      entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { arms_cm: up(0.1) }),
      entry("b", "2026-11-03T20:00:00", "2026-11-03T08:00:00", { arms_cm: up(0.2) }),
    ];
    const rows = subPeriodTotals(entries, ["arms_cm"], "week", windowOf("week", "2026-11-03"), "up");

    expect(rows[1]?.values.arms_cm).toEqual({ difference: 0.3, count: 2 });
  });
});

// October 2026 has 31 days, November 2026 30 and February 2027 28.
const october = windowOf("month", "2026-10-15");

function days(month: string, ...daysChanged: number[]): ChartMeasurement[] {
  return daysChanged.map((day) =>
    entry(`${month}-${day}`, `${month}-${String(day).padStart(2, "0")}T08:00:00`, `${month}-01T07:00:00`, {
      waist_cm: up(1),
    }),
  );
}

/** The day numbers of the labelled day axes (`12 Nov` → `12`); the full axis label is pinned separately. */
function labelledDays(rows: readonly SubPeriodRow[]): string[] {
  return rows.flatMap((row) => (row.axisLabel === "" ? [] : [row.axisLabel.split(" ")[0] ?? ""]));
}

describe("subPeriodTotals day axes", () => {
  it("has one row per day of 28-, 30- and 31-day months", () => {
    const options = { monthAxis: "days" } as const;
    const february = subPeriodTotals([], ["waist_cm"], "month", windowOf("month", "2027-02-10"), "up", options);
    const november = subPeriodTotals([], ["waist_cm"], "month", windowOf("month", "2026-11-04"), "up", options);
    const rows = subPeriodTotals([], ["waist_cm"], "month", october, "up", options);

    expect(february).toHaveLength(28);
    expect(november).toHaveLength(30);
    expect(rows).toHaveLength(31);
    expect(rows[0]?.key).toBe("2026-10-01");
    expect(rows[30]?.key).toBe("2026-10-31");
    expect(november[11]?.key).toBe("2026-11-12");
    expect(november[11]?.label).toBe("Thu 12 Nov");
  });

  it("names a labelled day axis with the day and the short month", () => {
    const rows = subPeriodTotals(days("2026-10", 12), ["waist_cm"], "month", october, "up", { monthAxis: "days" });

    expect(rows.map((row) => row.axisLabel).filter((label) => label !== "")).toEqual([
      "1 Oct",
      "7 Oct",
      "12 Oct",
      "19 Oct",
      "25 Oct",
      "31 Oct",
    ]);
    expect(rows[1]?.axisLabel).toBe("");
  });

  it("labels 6 evenly spread days from the first to the last when nothing changed", () => {
    const options = { monthAxis: "days" } as const;

    expect(labelledDays(subPeriodTotals([], ["waist_cm"], "month", october, "up", options))).toEqual([
      "1",
      "7",
      "13",
      "19",
      "25",
      "31",
    ]);
    expect(
      labelledDays(subPeriodTotals([], ["waist_cm"], "month", windowOf("month", "2026-11-04"), "up", options)),
    ).toEqual(["1", "7", "13", "18", "24", "30"]);
    expect(
      labelledDays(subPeriodTotals([], ["waist_cm"], "month", windowOf("month", "2027-02-10"), "up", options)),
    ).toEqual(["1", "6", "12", "17", "23", "28"]);
  });

  it.each([
    { changed: [12], labelled: ["1", "7", "12", "19", "25", "31"] },
    { changed: [5, 20], labelled: ["1", "5", "7", "13", "20", "31"] },
    { changed: [1], labelled: ["1", "7", "13", "19", "25", "31"] },
    { changed: [3, 9, 18, 27], labelled: ["1", "3", "9", "18", "27", "31"] },
    { changed: [2, 6, 10, 14, 18, 22, 26], labelled: ["2", "6", "10", "14", "18", "22", "26"] },
  ])("labels days $labelled for progress on $changed", ({ changed, labelled }) => {
    const rows = subPeriodTotals(days("2026-10", ...changed), ["waist_cm"], "month", october, "up", {
      monthAxis: "days",
    });

    expect(labelledDays(rows)).toEqual(labelled);
  });

  it("labels a day when any of the chart's fields changed on it", () => {
    const entries = [
      entry("a", "2026-10-07T08:00:00", "2026-10-01T07:00:00", { hips_cm: up(1) }),
      entry("b", "2026-10-09T08:00:00", "2026-10-07T08:00:00", { chest_cm: up(1) }),
      entry("c", "2026-10-11T08:00:00", "2026-10-09T08:00:00", { arms_cm: up(1) }),
    ];
    const rows = subPeriodTotals(entries, ["hips_cm", "chest_cm"], "month", october, "up", { monthAxis: "days" });

    expect(labelledDays(rows)).toEqual(["1", "7", "9", "13", "19", "31"]);
  });

  it("labels the gain and loss charts independently", () => {
    const entries = [
      entry("a", "2026-10-04T08:00:00", "2026-10-01T07:00:00", { waist_cm: up(1) }),
      entry("b", "2026-10-08T08:00:00", "2026-10-04T08:00:00", { waist_cm: up(1) }),
      entry("c", "2026-10-12T08:00:00", "2026-10-08T08:00:00", { waist_cm: up(1) }),
      entry("d", "2026-10-20T08:00:00", "2026-10-12T08:00:00", { waist_cm: down(2) }),
    ];
    const options = { monthAxis: "days" } as const;

    // Anchors 7 and 13 sit next to the gains on the 8th and 12th, and 19 next to the loss on the 20th, so they are skipped.
    expect(labelledDays(subPeriodTotals(entries, ["waist_cm"], "month", october, "up", options))).toEqual([
      "1",
      "4",
      "8",
      "12",
      "19",
      "31",
    ]);
    expect(labelledDays(subPeriodTotals(entries, ["waist_cm"], "month", october, "down", options))).toEqual([
      "1",
      "7",
      "13",
      "20",
      "25",
      "31",
    ]);
  });

  it("names the top day in the legend label, a tie going to the later day", () => {
    const entries = [
      entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { waist_cm: up(1) }),
      entry("b", "2026-11-12T08:00:00", "2026-11-03T08:00:00", { waist_cm: up(1) }),
    ];
    const rows = subPeriodTotals(entries, ["waist_cm"], "month", windowOf("month", "2026-11-04"), "up", {
      monthAxis: "days",
    });

    expect(topSubPeriod(rows, "waist_cm")?.label).toBe("Thu 12 Nov");
  });

  it("sums a day's entries into its row", () => {
    const entries = [
      entry("a", "2026-10-12T08:00:00", "2026-10-01T07:00:00", { waist_cm: up(0.1) }),
      entry("b", "2026-10-12T20:00:00", "2026-10-12T08:00:00", { waist_cm: up(0.2) }),
    ];
    const rows = subPeriodTotals(entries, ["waist_cm"], "month", october, "up", { monthAxis: "days" });

    expect(rows[11]?.values.waist_cm).toEqual({ difference: 0.3, count: 2 });
  });

  it("keeps calendar weeks by default and ignores the option outside Month", () => {
    const november = windowOf("month", "2026-11-04");

    expect(subPeriodTotals([], ["waist_cm"], "month", november, "up", { monthAxis: "weeks" })).toEqual(
      subPeriodTotals([], ["waist_cm"], "month", november, "up"),
    );
    for (const period of ["week", "year", "years"] as const) {
      const window = windowOf(period, "2026-11-04");

      expect(subPeriodTotals([], ["waist_cm"], period, window, "up", { monthAxis: "days" })).toEqual(
        subPeriodTotals([], ["waist_cm"], period, window, "up"),
      );
    }
  });
});

describe("labelMonthDays", () => {
  it("adds the first, then the last, then the inner anchor days until 6 are labelled", () => {
    const rows = subPeriodTotals(days("2026-10", 31), ["waist_cm"], "month", october, "up", { monthAxis: "days" });

    expect(labelledDays(labelMonthDays(rows))).toEqual(["1", "7", "13", "19", "25", "31"]);
  });

  it("skips anchors beside progress days in a 28-day month", () => {
    // Anchors 1, 6, 12, 17, 23, 28; progress on 2, 5 and 22 sits beside 1, 6 and 23.
    const february = windowOf("month", "2027-02-10");
    const rows = subPeriodTotals(days("2027-02", 2, 5, 22), ["waist_cm"], "month", february, "up", {
      monthAxis: "days",
    });

    expect(labelledDays(labelMonthDays(rows))).toEqual(["2", "5", "12", "17", "22", "28"]);
  });
});

describe("topSubPeriod", () => {
  it("picks the sub-period with the largest sum for the field", () => {
    const window = windowOf("month", "2026-11-04");

    expect(topSubPeriod(subPeriodTotals(november, ["weight_kg"], "month", window, "up"), "weight_kg")?.label).toBe(
      "2–8 Nov",
    );
    expect(topSubPeriod(subPeriodTotals(november, ["weight_kg"], "month", window, "down"), "weight_kg")?.label).toBe(
      "16–22 Nov",
    );
  });

  it("gives a tie to the later sub-period", () => {
    const entries = [
      entry("nov-3", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { waist_cm: up(1) }),
      entry("nov-20", "2026-11-20T08:00:00", "2026-11-03T08:00:00", { waist_cm: up(1) }),
    ];
    const window = windowOf("month", "2026-11-04");

    expect(topSubPeriod(subPeriodTotals(entries, ["waist_cm"], "month", window, "up"), "waist_cm")?.key).toBe(
      "2026-11-16",
    );
    expect(
      topSubPeriod(subPeriodTotals([...entries].reverse(), ["waist_cm"], "month", window, "up"), "waist_cm")?.key,
    ).toBe("2026-11-16");
  });

  it("is null when the field never went that way or was not requested", () => {
    const rows = subPeriodTotals(november, ["weight_kg"], "month", windowOf("month", "2026-11-04"), "up");

    expect(
      topSubPeriod(subPeriodTotals([], ["weight_kg"], "week", windowOf("week", "2026-11-04"), "up"), "weight_kg"),
    ).toBeNull();
    expect(topSubPeriod(rows, "waist_cm")).toBeNull();
  });
});

describe("topChangeScale", () => {
  it("is the largest value of every series across a gain and loss pair", () => {
    const entries = [
      entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { waist_cm: up(1), hips_cm: up(0.4) }),
      entry("b", "2026-11-10T08:00:00", "2026-11-03T08:00:00", { hips_cm: down(2.5) }),
    ];
    const window = windowOf("month", "2026-11-04");
    const gains = subPeriodTotals(entries, ["waist_cm", "hips_cm"], "month", window, "up");
    const losses = subPeriodTotals(entries, ["waist_cm", "hips_cm"], "month", window, "down");

    expect(topChangeScale(gains, losses)).toBe(2.5);
    expect(topChangeScale(gains)).toBe(1);
  });

  it("is 0 when nothing changed", () => {
    expect(topChangeScale(subPeriodTotals([], ["weight_kg"], "week", windowOf("week", "2026-11-04"), "up"))).toBe(0);
    expect(topChangeScale()).toBe(0);
  });
});
