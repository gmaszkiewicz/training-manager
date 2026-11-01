import { describe, expect, it } from "vitest";

import { measurementFields } from "@/lib/measurement-input";
import { circumferenceFields, topChangeScale, topChanges } from "@/lib/measurement-top-changes";
import type { ChartMeasurement, FieldDelta, MeasurementField } from "@/types";

const allFields: MeasurementField[] = measurementFields.map((definition) => definition.field);

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

describe("topChanges", () => {
  it("picks the window's first entry against an earlier entry, and the loss after it", () => {
    expect(topChanges(november, ["weight_kg"], "up")).toEqual([
      {
        field: "weight_kg",
        difference: 1.5,
        measuredOn: "2026-11-03T08:00:00",
        previousMeasuredOn: "2026-10-28T08:00:00",
      },
    ]);
    expect(topChanges(november, ["weight_kg"], "down")).toEqual([
      {
        field: "weight_kg",
        difference: 0.5,
        measuredOn: "2026-11-20T08:00:00",
        previousMeasuredOn: "2026-11-03T08:00:00",
      },
    ]);
  });

  it("gives a tie to the latest entry", () => {
    const entries = [
      entry("nov-3", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { waist_cm: up(1) }),
      entry("nov-20", "2026-11-20T08:00:00", "2026-11-03T08:00:00", { waist_cm: up(1) }),
    ];

    expect(topChanges(entries, ["waist_cm"], "up")[0]?.measuredOn).toBe("2026-11-20T08:00:00");
    expect(topChanges([...entries].reverse(), ["waist_cm"], "up")[0]?.measuredOn).toBe("2026-11-20T08:00:00");
  });

  it("returns nothing when the field only went down", () => {
    const entries = [
      entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { weight_kg: down(0.4) }),
      entry("b", "2026-11-10T08:00:00", "2026-11-03T08:00:00", { weight_kg: down(0.2) }),
    ];

    expect(topChanges(entries, ["weight_kg"], "up")).toEqual([]);
  });

  it("skips a first-ever entry with no deltas and ignores unchanged fields", () => {
    const entries = [
      entry("first", "2026-11-01T08:00:00", null, null),
      entry("second", "2026-11-02T08:00:00", "2026-11-01T08:00:00", { chest_cm: up(0.3) }),
    ];

    expect(topChanges(entries, allFields, "up")).toEqual([
      {
        field: "chest_cm",
        difference: 0.3,
        measuredOn: "2026-11-02T08:00:00",
        previousMeasuredOn: "2026-11-01T08:00:00",
      },
    ]);
    expect(topChanges(entries, allFields, "down")).toEqual([]);
    expect(topChanges([entries[0]], allFields, "up")).toEqual([]);
  });

  it("sorts the largest change first, and equal changes in field order", () => {
    const entries = [
      entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", {
        navel_cm: up(2),
        chest_cm: up(0.5),
        hips_cm: up(1),
        waist_cm: up(1),
      }),
      entry("b", "2026-11-04T08:00:00", "2026-11-03T08:00:00", { chest_cm: up(1.2), navel_cm: down(3) }),
    ];

    expect(topChanges(entries, circumferenceFields, "up").map((change) => [change.field, change.difference])).toEqual([
      ["navel_cm", 2],
      ["chest_cm", 1.2],
      ["waist_cm", 1],
      ["hips_cm", 1],
    ]);
  });

  it("returns only the requested fields", () => {
    const entries = [
      entry("a", "2026-11-03T08:00:00", "2026-10-28T08:00:00", { weight_kg: up(1), waist_cm: up(2), hips_cm: up(3) }),
    ];

    expect(topChanges(entries, ["waist_cm"], "up").map((change) => change.field)).toEqual(["waist_cm"]);
    expect(topChanges(entries, [], "up")).toEqual([]);
  });
});

describe("topChangeScale", () => {
  it("is the largest difference across a gain and loss pair", () => {
    const gains = topChanges(november, ["weight_kg"], "up");
    const losses = topChanges(november, ["weight_kg"], "down");

    expect(topChangeScale(gains, losses)).toBe(1.5);
    expect(topChangeScale(losses)).toBe(0.5);
  });

  it("is 0 when every list is empty", () => {
    expect(topChangeScale([], [])).toBe(0);
    expect(topChangeScale()).toBe(0);
  });
});
