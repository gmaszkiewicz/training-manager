import { describe, expect, it } from "vitest";

import {
  createMeasurementInputSchema,
  DUPLICATE_MEASUREMENT_MESSAGE,
  duplicateMeasurementMessage,
  measurementFieldMessage,
  parseMeasuredOn,
  parseMeasurementField,
} from "@/lib/measurement-input";

const now = new Date("2026-09-28T12:00:00.000Z");

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    measured_on: "2026-09-28T12:00",
    weight_kg: 80,
    chest_cm: 50,
    waist_cm: 50,
    arms_cm: 50,
    thigh_cm: 50,
    calf_cm: 50,
    hips_cm: 50,
    navel_cm: 50,
    note: "",
    ...overrides,
  };
}

function messageFor(issues: { path: PropertyKey[]; message: string }[], field: string): string | undefined {
  return issues.find((issue) => issue.path[0] === field)?.message;
}

describe("createMeasurementInputSchema", () => {
  const schema = createMeasurementInputSchema(now);

  it("accepts the inclusive boundaries", () => {
    const low = schema.safeParse(
      validInput({
        weight_kg: 20,
        chest_cm: 10,
        waist_cm: 10,
        arms_cm: 10,
        thigh_cm: 10,
        calf_cm: 10,
        hips_cm: 10,
        navel_cm: 10,
      }),
    );
    const high = schema.safeParse(
      validInput({
        weight_kg: 400,
        chest_cm: 300,
        waist_cm: 300,
        arms_cm: 300,
        thigh_cm: 300,
        calf_cm: 300,
        hips_cm: 300,
        navel_cm: 300,
      }),
    );
    const lowStrings = schema.safeParse(
      validInput({
        weight_kg: "20",
        chest_cm: "10",
        waist_cm: "10",
        arms_cm: "10",
        thigh_cm: "10",
        calf_cm: "10",
        hips_cm: "10",
        navel_cm: "10",
      }),
    );
    const highStrings = schema.safeParse(
      validInput({
        weight_kg: "400",
        chest_cm: "300",
        waist_cm: "300",
        arms_cm: "300",
        thigh_cm: "300",
        calf_cm: "300",
        hips_cm: "300",
        navel_cm: "300",
      }),
    );

    expect(low.success).toBe(true);
    expect(high.success).toBe(true);
    expect(lowStrings.success).toBe(true);
    expect(highStrings.success).toBe(true);
    if (low.success && high.success) {
      expect(low.data.weight_kg).toBe(20);
      expect(low.data.chest_cm).toBe(10);
      expect(high.data.weight_kg).toBe(400);
      expect(high.data.navel_cm).toBe(300);
    }
  });

  it("rejects weight outside 20 to 400", () => {
    for (const weight of [19.9, 400.1, "19.9", "400.1"]) {
      const result = schema.safeParse(validInput({ weight_kg: weight }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(messageFor(result.error.issues, "weight_kg")).toBe("Weight must be between 20 and 400 kg");
      }
    }
  });

  it("rejects circumference values outside 10 to 300", () => {
    for (const chest of [9.9, 300.1]) {
      const result = schema.safeParse(validInput({ chest_cm: chest }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(messageFor(result.error.issues, "chest_cm")).toBe("Chest must be between 10 and 300 cm");
      }
    }
  });

  it("rejects a negative value instead of treating the sign as a bad decimal", () => {
    for (const weight of ["-8", -8, "-12.34"]) {
      const result = schema.safeParse(validInput({ weight_kg: weight }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(messageFor(result.error.issues, "weight_kg")).toBe("Weight cannot be negative");
      }
    }
  });

  it("rejects more than one decimal place instead of rounding", () => {
    for (const weight of ["80.25", 80.25]) {
      const result = schema.safeParse(validInput({ weight_kg: weight }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(messageFor(result.error.issues, "weight_kg")).toBe(
          "Weight must be a number with at most one decimal place",
        );
      }
    }
  });

  it("rejects an empty field", () => {
    const result = schema.safeParse(validInput({ weight_kg: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(messageFor(result.error.issues, "weight_kg")).toBe("Weight is required");
    }
  });

  it("accepts a comma as the decimal separator", () => {
    const result = schema.safeParse(validInput({ weight_kg: "80,5" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weight_kg).toBe(80.5);
    }
  });

  it("trims a note and turns an empty note into null", () => {
    const empty = schema.safeParse(validInput({ note: "" }));
    const blank = schema.safeParse(validInput({ note: "   " }));
    const padded = schema.safeParse(validInput({ note: "  after training  " }));
    const omitted = schema.safeParse(validInput({ note: undefined }));

    expect(empty.success && empty.data.note).toBeNull();
    expect(blank.success && blank.data.note).toBeNull();
    expect(padded.success && padded.data.note).toBe("after training");
    expect(omitted.success && omitted.data.note).toBeNull();
  });

  it("rejects a note of 1001 characters and accepts 1000", () => {
    const tooLong = schema.safeParse(validInput({ note: "a".repeat(1001) }));
    const atLimit = schema.safeParse(validInput({ note: "a".repeat(1000) }));

    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      expect(messageFor(tooLong.error.issues, "note")).toBe("Note must be at most 1000 characters");
    }
    expect(atLimit.success).toBe(true);
    if (atLimit.success) {
      expect(atLimit.data.note).toHaveLength(1000);
    }
  });

  it("accepts the current UTC minute and rejects a later minute", () => {
    const today = schema.safeParse(validInput({ measured_on: "2026-09-28T12:00" }));
    const nextMinute = schema.safeParse(validInput({ measured_on: "2026-09-28T12:01" }));
    const tomorrow = schema.safeParse(validInput({ measured_on: "2026-09-29T23:59" }));

    expect(today.success).toBe(true);
    expect(nextMinute.success).toBe(false);
    expect(tomorrow.success).toBe(false);
    if (!nextMinute.success) {
      expect(messageFor(nextMinute.error.issues, "measured_on")).toBe("Date and time must not be later than now");
    }
    if (!tomorrow.success) {
      expect(messageFor(tomorrow.error.issues, "measured_on")).toBe("Date and time must not be later than now");
    }
  });

  it("rejects a calendar date that does not exist", () => {
    const result = schema.safeParse(validInput({ measured_on: "2026-02-29T00:00" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(messageFor(result.error.issues, "measured_on")).toBe(
        "Date and time must be a valid YYYY-MM-DDTHH:mm value.",
      );
    }
  });

  it("accepts the ceiling minute, rejects the next minute, and rejects a date-only string", () => {
    const ceilingNow = new Date("2026-10-06T22:00:00.000Z");
    const ceilingSchema = createMeasurementInputSchema(ceilingNow);
    const allowed = ceilingSchema.safeParse(validInput({ measured_on: "2026-10-06T22:00" }));
    const rejected = ceilingSchema.safeParse(validInput({ measured_on: "2026-10-06T22:01" }));
    const dateOnly = ceilingSchema.safeParse(validInput({ measured_on: "2026-10-06" }));

    expect(allowed.success).toBe(true);
    if (allowed.success) {
      expect(allowed.data.measured_on).toBe("2026-10-06T22:00:00");
    }
    expect(rejected.success).toBe(false);
    if (!rejected.success) {
      expect(messageFor(rejected.error.issues, "measured_on")).toBe("Date and time must not be later than now");
    }
    expect(dateOnly.success).toBe(false);
    if (!dateOnly.success) {
      expect(messageFor(dateOnly.error.issues, "measured_on")).toBe(
        "Date and time must be a valid YYYY-MM-DDTHH:mm value.",
      );
    }
  });

  it("zeros seconds instead of rounding", () => {
    const ceilingNow = new Date("2026-10-06T22:00:00.000Z");
    const result = createMeasurementInputSchema(ceilingNow).safeParse(
      validInput({ measured_on: "2026-10-06T07:30:45" }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.measured_on).toBe("2026-10-06T07:30:00");
    }
  });
});

describe("parseMeasuredOn", () => {
  const ceilingNow = new Date("2026-10-06T22:00:00.000Z");

  it("returns the normalized minute", () => {
    expect(parseMeasuredOn("2026-10-06T07:30", ceilingNow)).toBe("2026-10-06T07:30:00");
    expect(parseMeasuredOn("2026-10-06T07:30:45", ceilingNow)).toBe("2026-10-06T07:30:00");
    expect(parseMeasuredOn("2026-10-06T22:00", ceilingNow)).toBe("2026-10-06T22:00:00");
  });

  it("returns null when the minute is empty, malformed, or too late", () => {
    expect(parseMeasuredOn("", ceilingNow)).toBeNull();
    expect(parseMeasuredOn(null, ceilingNow)).toBeNull();
    expect(parseMeasuredOn("2026-10-06", ceilingNow)).toBeNull();
    expect(parseMeasuredOn("2026-02-29T00:00", ceilingNow)).toBeNull();
    expect(parseMeasuredOn("2026-10-06T22:01", ceilingNow)).toBeNull();
    expect(parseMeasuredOn("2026-10-08T00:00", ceilingNow)).toBeNull();
  });
});

describe("parseMeasurementField", () => {
  it("returns the number when that field would pass submit", () => {
    expect(parseMeasurementField("weight_kg", "78.5")).toBe(78.5);
    expect(parseMeasurementField("chest_cm", "60")).toBe(60);
  });

  it("returns null when the field is empty, has more than one decimal, or is outside its range", () => {
    expect(parseMeasurementField("weight_kg", "")).toBeNull();
    expect(parseMeasurementField("weight_kg", "78.55")).toBeNull();
    expect(parseMeasurementField("weight_kg", 19.9)).toBeNull();
    expect(parseMeasurementField("chest_cm", "60")).toBe(60);
  });
});

describe("measurementFieldMessage", () => {
  it("returns the required sentence for an empty weight", () => {
    expect(measurementFieldMessage("weight_kg", "")).toBe("Weight is required");
  });

  it("returns null when the weight is in range", () => {
    expect(measurementFieldMessage("weight_kg", 80)).toBeNull();
    expect(measurementFieldMessage("weight_kg", "80")).toBeNull();
  });

  it("returns the range sentence below the weight minimum", () => {
    expect(measurementFieldMessage("weight_kg", 8)).toBe("Weight must be between 20 and 400 kg");
  });

  it("returns the negative sentence for a signed weight", () => {
    expect(measurementFieldMessage("weight_kg", "-8")).toBe("Weight cannot be negative");
    expect(measurementFieldMessage("weight_kg", -8)).toBe("Weight cannot be negative");
    expect(measurementFieldMessage("weight_kg", "-12.34")).toBe("Weight cannot be negative");
    expect(measurementFieldMessage("chest_cm", "-1")).toBe("Chest cannot be negative");
  });

  it("returns the decimal sentence for more than one place or a trailing separator", () => {
    expect(measurementFieldMessage("weight_kg", 12.34)).toBe("Weight must be a number with at most one decimal place");
    expect(measurementFieldMessage("weight_kg", "12.34")).toBe(
      "Weight must be a number with at most one decimal place",
    );
    expect(measurementFieldMessage("weight_kg", "80.")).toBe("Weight must be a number with at most one decimal place");
  });
});

describe("duplicateMeasurementMessage", () => {
  const occupied = ["2026-10-16 04:27:00", "2026-10-13T15:35:00"];

  it("returns the duplicate sentence when the selected minute is taken", () => {
    expect(duplicateMeasurementMessage("2026-10-16T04:27", occupied)).toBe(DUPLICATE_MEASUREMENT_MESSAGE);
    expect(duplicateMeasurementMessage("2026-10-13T15:35", occupied)).toBe(DUPLICATE_MEASUREMENT_MESSAGE);
  });

  it("returns null when the selected minute is free", () => {
    expect(duplicateMeasurementMessage("2026-10-16T04:28", occupied)).toBeNull();
  });

  it("returns null when the taken minute belongs to the entry being edited", () => {
    expect(duplicateMeasurementMessage("2026-10-16T04:27", occupied, "2026-10-16T04:27:00")).toBeNull();
  });
});
