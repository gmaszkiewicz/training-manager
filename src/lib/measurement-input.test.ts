import { describe, expect, it } from "vitest";

import { createMeasurementInputSchema } from "@/lib/measurement-input";

const now = new Date("2026-09-28T12:00:00.000Z");

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    measured_on: "2026-09-28",
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

  it("accepts UTC today plus one day and rejects plus two days", () => {
    const today = schema.safeParse(validInput({ measured_on: "2026-09-28" }));
    const plusOne = schema.safeParse(validInput({ measured_on: "2026-09-29" }));
    const plusTwo = schema.safeParse(validInput({ measured_on: "2026-09-30" }));

    expect(today.success).toBe(true);
    expect(plusOne.success).toBe(true);
    expect(plusTwo.success).toBe(false);
    if (!plusTwo.success) {
      expect(messageFor(plusTwo.error.issues, "measured_on")).toBe("Date must not be later than one day from today");
    }
  });

  it("rejects a calendar date that does not exist", () => {
    const result = schema.safeParse(validInput({ measured_on: "2026-02-29" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(messageFor(result.error.issues, "measured_on")).toBe("Date must be a valid YYYY-MM-DD calendar date");
    }
  });
});
