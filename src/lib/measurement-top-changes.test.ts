import { describe, expect, it } from "vitest";

import { chartWindow, lastYearsRange } from "@/lib/measurement-chart";
import {
  circumferenceFields,
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
