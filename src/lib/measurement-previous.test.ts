import { describe, expect, it } from "vitest";

import { measurementFields } from "@/lib/measurement-input";
import { measurementFieldValues, prefillUntypedFields, previousMeasurement } from "@/lib/measurement-previous";
import type { MeasurementEntry } from "@/types";

function entry(
  partial: Pick<MeasurementEntry, "id" | "measured_on" | "created_at" | "weight_kg"> & Partial<MeasurementEntry>,
): MeasurementEntry {
  return {
    arms_cm: 50,
    calf_cm: 50,
    chest_cm: 50,
    hips_cm: 50,
    navel_cm: 50,
    note: null,
    thigh_cm: 50,
    waist_cm: 50,
    ...partial,
  };
}

describe("previousMeasurement", () => {
  it("selects the latest saved row strictly before a minute between two rows", () => {
    const nine = entry({
      id: "nine",
      measured_on: "2026-10-06T09:00:00",
      created_at: "2026-10-06T09:00:00.000Z",
      weight_kg: 79,
    });
    const ten = entry({
      id: "ten",
      measured_on: "2026-10-06T10:00:00",
      created_at: "2026-10-06T10:00:00.000Z",
      weight_kg: 80,
    });
    const eleven = entry({
      id: "eleven",
      measured_on: "2026-10-06T11:00:00",
      created_at: "2026-10-06T11:00:00.000Z",
      weight_kg: 78.5,
    });
    const rows = [eleven, nine, ten];

    expect(previousMeasurement(rows, "2026-10-06T10:30:00")).toBe(ten);
    expect(rows.map((row) => row.id)).toEqual(["eleven", "nine", "ten"]);
  });

  it("selects an earlier minute on the same calendar day", () => {
    const yesterday = entry({
      id: "yesterday",
      measured_on: "2026-10-05T19:00:00",
      created_at: "2026-10-05T19:00:00.000Z",
      weight_kg: 81,
    });
    const morning = entry({
      id: "morning",
      measured_on: "2026-10-06T07:00:00",
      created_at: "2026-10-07T08:00:00.000Z",
      weight_kg: 80,
    });
    const evening = entry({
      id: "evening",
      measured_on: "2026-10-06T19:00:00",
      created_at: "2026-10-06T07:00:00.000Z",
      weight_kg: 82,
    });

    expect(previousMeasurement([evening, yesterday, morning], "2026-10-06T10:00:00")).toBe(morning);
  });

  it("selects the row before a saved minute when the typed minute equals that saved minute", () => {
    const nine = entry({
      id: "nine",
      measured_on: "2026-10-06T09:00:00",
      created_at: "2026-10-06T09:00:00.000Z",
      weight_kg: 79,
    });
    const ten = entry({
      id: "ten",
      measured_on: "2026-10-06T10:00:00",
      created_at: "2026-10-06T10:00:00.000Z",
      weight_kg: 80,
    });
    const eleven = entry({
      id: "eleven",
      measured_on: "2026-10-06T11:00:00",
      created_at: "2026-10-06T11:00:00.000Z",
      weight_kg: 78.5,
    });

    expect(previousMeasurement([nine, eleven, ten], "2026-10-06T11:00:00")).toBe(ten);
  });

  it("selects nothing when every saved row is later", () => {
    const nine = entry({
      id: "nine",
      measured_on: "2026-10-06T09:00:00",
      created_at: "2026-10-06T09:00:00.000Z",
      weight_kg: 79,
    });
    const ten = entry({
      id: "ten",
      measured_on: "2026-10-06T10:00:00",
      created_at: "2026-10-06T10:00:00.000Z",
      weight_kg: 80,
    });

    expect(previousMeasurement([ten, nine], "2026-10-06T08:00:00")).toBeNull();
  });

  it("orders a same-timestamp pair by id", () => {
    const lowerId = entry({
      id: "a",
      measured_on: "2026-10-06T07:00:00",
      created_at: "2026-10-06T18:00:00.000Z",
      weight_kg: 80,
    });
    const higherId = entry({
      id: "b",
      measured_on: "2026-10-06T07:00:00",
      created_at: "2026-10-06T08:00:00.000Z",
      weight_kg: 82,
    });
    const evening = entry({
      id: "c",
      measured_on: "2026-10-06T19:00:00",
      created_at: "2026-10-06T19:00:00.000Z",
      weight_kg: 81,
    });

    expect(previousMeasurement([lowerId, evening, higherId], "2026-10-06T08:00:00")).toBe(higherId);
  });
});

describe("measurementFieldValues", () => {
  it("returns every field empty when there is no entry", () => {
    expect(measurementFieldValues(null)).toEqual({
      weight_kg: "",
      chest_cm: "",
      waist_cm: "",
      arms_cm: "",
      thigh_cm: "",
      calf_cm: "",
      hips_cm: "",
      navel_cm: "",
    });
  });

  it("returns each field of an entry to one decimal place", () => {
    const values = measurementFieldValues({
      weight_kg: 78,
      chest_cm: 36.25,
      waist_cm: 80.5,
      arms_cm: 32.04,
      thigh_cm: 55.96,
      calf_cm: 38,
      hips_cm: 99.9,
      navel_cm: 84.1,
    });

    expect(values).toEqual({
      weight_kg: "78.0",
      chest_cm: (36.25).toFixed(1),
      waist_cm: "80.5",
      arms_cm: "32.0",
      thigh_cm: "56.0",
      calf_cm: "38.0",
      hips_cm: "99.9",
      navel_cm: "84.1",
    });
  });

  it("returns exactly the measurement field keys, without note or date", () => {
    const full = entry({
      id: "full",
      measured_on: "2026-10-06T09:00:00",
      created_at: "2026-10-06T09:00:00.000Z",
      weight_kg: 79,
      note: "Felt good",
    });
    const keys = Object.keys(measurementFieldValues(full));

    expect(keys.sort()).toEqual(measurementFields.map((definition) => definition.field).sort());
    expect(keys).not.toContain("note");
    expect(keys).not.toContain("measured_on");
  });
});

describe("prefillUntypedFields", () => {
  const current = {
    weight_kg: "81.5",
    chest_cm: "",
    waist_cm: "70.0",
    arms_cm: "30.0",
    thigh_cm: "50.0",
    calf_cm: "35.0",
    hips_cm: "90.0",
    navel_cm: "75.0",
  };
  const earlier = entry({
    id: "earlier",
    measured_on: "2026-10-29T05:15:00",
    created_at: "2026-10-29T05:15:00.000Z",
    weight_kg: 78,
  });

  it("replaces untyped fields with the earlier entry and keeps typed ones", () => {
    expect(prefillUntypedFields(current, earlier, new Set(["weight_kg", "chest_cm"]))).toEqual({
      weight_kg: "81.5",
      chest_cm: "",
      waist_cm: "50.0",
      arms_cm: "50.0",
      thigh_cm: "50.0",
      calf_cm: "50.0",
      hips_cm: "50.0",
      navel_cm: "50.0",
    });
  });

  it("empties untyped fields when there is no earlier entry", () => {
    expect(prefillUntypedFields(current, null, new Set(["weight_kg"]))).toEqual({
      weight_kg: "81.5",
      chest_cm: "",
      waist_cm: "",
      arms_cm: "",
      thigh_cm: "",
      calf_cm: "",
      hips_cm: "",
      navel_cm: "",
    });
  });
});
