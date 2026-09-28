import { z } from "zod";

import type { MeasurementField } from "@/types";

const NOTE_MAX_LENGTH = 1000;
const ONE_DECIMAL_TEXT = /^\d+(?:[.,]\d)?$/;
const ONE_DECIMAL_NUMBER = /^\d+(?:\.\d)?$/;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface MeasurementFieldDefinition {
  field: MeasurementField;
  label: string;
  unit: "kg" | "cm";
}

const weightField = { field: "weight_kg", label: "Weight", unit: "kg" } satisfies MeasurementFieldDefinition;
const chestField = { field: "chest_cm", label: "Chest", unit: "cm" } satisfies MeasurementFieldDefinition;
const waistField = { field: "waist_cm", label: "Waist", unit: "cm" } satisfies MeasurementFieldDefinition;
const armsField = { field: "arms_cm", label: "Arm", unit: "cm" } satisfies MeasurementFieldDefinition;
const thighField = { field: "thigh_cm", label: "Thigh", unit: "cm" } satisfies MeasurementFieldDefinition;
const calfField = { field: "calf_cm", label: "Calf", unit: "cm" } satisfies MeasurementFieldDefinition;
const hipsField = { field: "hips_cm", label: "Hips", unit: "cm" } satisfies MeasurementFieldDefinition;
const navelField = { field: "navel_cm", label: "Navel", unit: "cm" } satisfies MeasurementFieldDefinition;

export const measurementFields = [
  weightField,
  chestField,
  waistField,
  armsField,
  thighField,
  calfField,
  hipsField,
  navelField,
] as const;

function reject(ctx: z.RefinementCtx, message: string): never {
  ctx.addIssue(message);
  return z.NEVER;
}

function readMeasurementNumber(
  value: unknown,
): { ok: true; value: number } | { ok: false; reason: "required" | "invalid" } {
  if (value === undefined || value === null || value === "") {
    return { ok: false, reason: "required" };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !ONE_DECIMAL_NUMBER.test(value.toString())) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, value };
  }
  if (typeof value === "string" && ONE_DECIMAL_TEXT.test(value)) {
    return { ok: true, value: Number(value.replace(",", ".")) };
  }
  return { ok: false, reason: "invalid" };
}

function measurementNumber(definition: MeasurementFieldDefinition, min: number, max: number) {
  return z.unknown().transform((value, ctx): number => {
    const parsed = readMeasurementNumber(value);
    if (!parsed.ok) {
      if (parsed.reason === "required") {
        return reject(ctx, `${definition.label} is required`);
      }
      return reject(ctx, `${definition.label} must be a number with at most one decimal place`);
    }
    if (parsed.value < min || parsed.value > max) {
      return reject(ctx, `${definition.label} must be between ${min} and ${max} ${definition.unit}`);
    }
    return parsed.value;
  });
}

function formatUtcDate(year: number, month: number, day: number): string {
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return `${String(year)}-${paddedMonth}-${paddedDay}`;
}

function latestMeasuredOn(now: Date): string {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const latest = new Date(todayUtc + MILLISECONDS_PER_DAY);
  return formatUtcDate(latest.getUTCFullYear(), latest.getUTCMonth() + 1, latest.getUTCDate());
}

function isValidCalendarDate(value: string): boolean {
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function measuredOn(now: Date) {
  const latest = latestMeasuredOn(now);
  return z.unknown().transform((value, ctx): string => {
    if (value === undefined || value === null || value === "") {
      return reject(ctx, "Date is required");
    }
    if (typeof value !== "string" || !isValidCalendarDate(value)) {
      return reject(ctx, "Date must be a valid YYYY-MM-DD calendar date");
    }
    if (value > latest) {
      return reject(ctx, "Date must not be later than one day from today");
    }
    return value;
  });
}

function note() {
  return z
    .unknown()
    .optional()
    .transform((value, ctx): string | null => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value !== "string") {
        return reject(ctx, "Note must be text");
      }
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return null;
      }
      if (trimmed.length > NOTE_MAX_LENGTH) {
        return reject(ctx, "Note must be at most 1000 characters");
      }
      return trimmed;
    });
}

export function createMeasurementInputSchema(now: Date) {
  return z.object({
    measured_on: measuredOn(now),
    weight_kg: measurementNumber(weightField, 20, 400),
    chest_cm: measurementNumber(chestField, 10, 300),
    waist_cm: measurementNumber(waistField, 10, 300),
    arms_cm: measurementNumber(armsField, 10, 300),
    thigh_cm: measurementNumber(thighField, 10, 300),
    calf_cm: measurementNumber(calfField, 10, 300),
    hips_cm: measurementNumber(hipsField, 10, 300),
    navel_cm: measurementNumber(navelField, 10, 300),
    note: note(),
  });
}
