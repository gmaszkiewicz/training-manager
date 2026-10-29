import { z } from "zod";

import type { MeasurementField } from "@/types";

export const NOTE_MAX_LENGTH = 1000;

export const DUPLICATE_MEASUREMENT_MESSAGE = "A measurement at that date and time already exists.";
const ONE_DECIMAL_TEXT = /^\d+(?:[.,]\d)?$/;
const ONE_DECIMAL_NUMBER = /^\d+(?:\.\d)?$/;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MEASURED_ON = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
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

function isNegativeMeasurement(value: unknown): boolean {
  if (typeof value === "number") {
    return value < 0;
  }
  return typeof value === "string" && value.trimStart().startsWith("-");
}

function readMeasurementNumber(
  value: unknown,
): { ok: true; value: number } | { ok: false; reason: "required" | "negative" | "invalid" } {
  if (value === undefined || value === null || value === "") {
    return { ok: false, reason: "required" };
  }
  if (isNegativeMeasurement(value)) {
    return { ok: false, reason: "negative" };
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
      if (parsed.reason === "negative") {
        return reject(ctx, `${definition.label} cannot be negative`);
      }
      return reject(ctx, `${definition.label} must be a number with at most one decimal place`);
    }
    if (parsed.value < min || parsed.value > max) {
      return reject(ctx, `${definition.label} must be between ${min} and ${max} ${definition.unit}`);
    }
    return parsed.value;
  });
}

export const measurementLimits = {
  weight_kg: { min: 20, max: 400 },
  chest_cm: { min: 10, max: 300 },
  waist_cm: { min: 10, max: 300 },
  arms_cm: { min: 10, max: 300 },
  thigh_cm: { min: 10, max: 300 },
  calf_cm: { min: 10, max: 300 },
  hips_cm: { min: 10, max: 300 },
  navel_cm: { min: 10, max: 300 },
} as const satisfies Record<MeasurementField, { min: number; max: number }>;

const measurementFieldNumbers = {
  weight_kg: measurementNumber(weightField, measurementLimits.weight_kg.min, measurementLimits.weight_kg.max),
  chest_cm: measurementNumber(chestField, measurementLimits.chest_cm.min, measurementLimits.chest_cm.max),
  waist_cm: measurementNumber(waistField, measurementLimits.waist_cm.min, measurementLimits.waist_cm.max),
  arms_cm: measurementNumber(armsField, measurementLimits.arms_cm.min, measurementLimits.arms_cm.max),
  thigh_cm: measurementNumber(thighField, measurementLimits.thigh_cm.min, measurementLimits.thigh_cm.max),
  calf_cm: measurementNumber(calfField, measurementLimits.calf_cm.min, measurementLimits.calf_cm.max),
  hips_cm: measurementNumber(hipsField, measurementLimits.hips_cm.min, measurementLimits.hips_cm.max),
  navel_cm: measurementNumber(navelField, measurementLimits.navel_cm.min, measurementLimits.navel_cm.max),
};

export function measurementFieldRange(field: MeasurementField): string {
  const limits = measurementLimits[field];
  return `${limits.min}\u2013${limits.max}`;
}

export function measuredOnPartRange(part: "hour" | "minute", day: string, time: string, ceilingMinute: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(ceilingMinute);
  if (match === null || day < match[1]) {
    return part === "hour" ? "0\u201323" : "0\u201359";
  }
  const ceilingHour = Number(match[2]);
  const ceilingMinuteOfHour = Number(match[3]);
  if (part === "hour") {
    return `0\u2013${ceilingHour}`;
  }
  const hour = Number(time.slice(0, 2));
  if (Number.isFinite(hour) && hour < ceilingHour) {
    return "0\u201359";
  }
  return `0\u2013${ceilingMinuteOfHour}`;
}

export function parseMeasurementField(field: MeasurementField, value: unknown): number | null {
  const parsed = measurementFieldNumbers[field].safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export function measurementFieldMessage(field: MeasurementField, value: unknown): string | null {
  const parsed = measurementFieldNumbers[field].safeParse(value);
  if (parsed.success) {
    return null;
  }
  return parsed.error.issues[0]?.message ?? null;
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

function formatUtcMinute(date: Date): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** Same sign as `Date.getTimezoneOffset()`: minutes added to local time to get UTC. */
const MIN_UTC_OFFSET_MINUTES = -14 * 60;
const MAX_UTC_OFFSET_MINUTES = 12 * 60;

export function readUtcOffsetMinutes(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    return null;
  }
  const offset = Number(value);
  if (offset < MIN_UTC_OFFSET_MINUTES || offset > MAX_UTC_OFFSET_MINUTES) {
    return null;
  }
  return offset;
}

function wallClockCeiling(now: Date, utcOffsetMinutes: number): string {
  return formatUtcMinute(new Date(now.getTime() - utcOffsetMinutes * 60 * 1000));
}

/** A bound for "newest entry before" reads that includes the latest minute any accepted offset can save. */
export function latestMeasuredOnBound(now: Date): string {
  return wallClockCeiling(new Date(now.getTime() + 60 * 1000), MIN_UTC_OFFSET_MINUTES);
}

export function measuredOnMax(now: Date): string {
  return `${latestMeasuredOn(now)}T23:59`;
}

export function toMeasuredOnLocalValue(value: string): string {
  return value.replace(" ", "T").slice(0, 16);
}

export function duplicateMeasurementMessage(
  minute: string,
  occupiedMinutes: readonly string[],
  editingMinute: string | null = null,
): string | null {
  const key = toMeasuredOnLocalValue(minute);
  if (editingMinute !== null && toMeasuredOnLocalValue(editingMinute) === key) {
    return null;
  }
  const taken = occupiedMinutes.some((value) => toMeasuredOnLocalValue(value) === key);
  return taken ? DUPLICATE_MEASUREMENT_MESSAGE : null;
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

function measuredOn(now: Date, utcOffsetMinutes: number) {
  const ceiling = wallClockCeiling(now, utcOffsetMinutes);
  return z.unknown().transform((value, ctx): string => {
    if (value === undefined || value === null || value === "") {
      return reject(ctx, "Date and time are required.");
    }
    if (typeof value !== "string") {
      return reject(ctx, "Date and time must be a valid YYYY-MM-DDTHH:mm value.");
    }
    const match = MEASURED_ON.exec(value);
    if (match === null) {
      return reject(ctx, "Date and time must be a valid YYYY-MM-DDTHH:mm value.");
    }
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6] || "0");
    if (!isValidCalendarDate(date) || hour > 23 || minute > 59 || second > 59) {
      return reject(ctx, "Date and time must be a valid YYYY-MM-DDTHH:mm value.");
    }
    const hourText = match[4];
    const minuteText = match[5];
    if (`${date}T${hourText}:${minuteText}` > ceiling) {
      return reject(ctx, "Date and time must not be later than now");
    }
    return `${date}T${hourText}:${minuteText}:00`;
  });
}

export function parseMeasuredOn(value: unknown, now: Date, utcOffsetMinutes = 0): string | null {
  const parsed = measuredOn(now, utcOffsetMinutes).safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
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

export function createMeasurementInputSchema(now: Date, utcOffsetMinutes = 0) {
  return z.object({
    measured_on: measuredOn(now, utcOffsetMinutes),
    weight_kg: measurementFieldNumbers.weight_kg,
    chest_cm: measurementFieldNumbers.chest_cm,
    waist_cm: measurementFieldNumbers.waist_cm,
    arms_cm: measurementFieldNumbers.arms_cm,
    thigh_cm: measurementFieldNumbers.thigh_cm,
    calf_cm: measurementFieldNumbers.calf_cm,
    hips_cm: measurementFieldNumbers.hips_cm,
    navel_cm: measurementFieldNumbers.navel_cm,
    note: note(),
  });
}
