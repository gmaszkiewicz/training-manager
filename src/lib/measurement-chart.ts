import { monthLabel, weekContaining } from "@/lib/journal-calendar";
import { measurementLimits } from "@/lib/measurement-input";
import { measurementMonth, monthWindow } from "@/lib/measurement-page";
import type { MeasurementField } from "@/types";

export const chartPeriods = ["week", "month", "year", "years"] as const;

export type ChartPeriod = (typeof chartPeriods)[number];

export const defaultChartPeriod: ChartPeriod = "month";

export const CHART_SELECTION_LIMIT = 15;

export interface ChartWindow {
  start: string;
  end: string;
}

export interface ChartYAxis {
  domain: [number, number];
  ticks: number[];
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const AXIS_STEP = 5;
const ONE_TICK_PER_ENTRY_LIMIT = 8;
const CHART_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MEASURED_ON = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function parseChartPeriod(value: unknown): ChartPeriod {
  if (value === "week" || value === "month" || value === "year" || value === "years") {
    return value;
  }
  return defaultChartPeriod;
}

export function parseChartAnchor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = CHART_DAY.exec(value);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return value;
}

function formatDay(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const paddedMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const paddedDay = String(date.getUTCDate()).padStart(2, "0");
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${paddedMonth}-${paddedDay}`;
}

function dayParts(day: string): { year: number; month: number; day: number } {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)), day: Number(day.slice(8, 10)) };
}

function addDays(day: string, delta: number): string {
  const parts = dayParts(day);
  return formatDay(parts.year, parts.month, parts.day + delta);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonthsClamped(day: string, delta: number): string {
  const parts = dayParts(day);
  const target = new Date(Date.UTC(parts.year, parts.month - 1 + delta, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  return formatDay(year, month, Math.min(parts.day, daysInMonth(year, month)));
}

function yearWindow(year: number): ChartWindow {
  return {
    start: `${String(year).padStart(4, "0")}-01-01T00:00:00`,
    end: `${String(year + 1).padStart(4, "0")}-01-01T00:00:00`,
  };
}

export function chartWindow(
  period: ChartPeriod,
  anchorDay: string,
  earliestMonth: string | null,
  today: string,
): ChartWindow {
  if (period === "week") {
    const days = weekContaining(anchorDay);
    return { start: `${days[0]}T00:00:00`, end: `${addDays(days[6], 1)}T00:00:00` };
  }
  if (period === "month") {
    return monthWindow(measurementMonth(anchorDay));
  }
  if (period === "year") {
    return yearWindow(Number(anchorDay.slice(0, 4)));
  }
  const todayYear = Number(today.slice(0, 4));
  const earliestYear = earliestMonth === null ? todayYear : Math.min(Number(earliestMonth.slice(0, 4)), todayYear);
  return { start: yearWindow(earliestYear).start, end: yearWindow(todayYear).end };
}

export function stepAnchor(period: ChartPeriod, anchorDay: string, direction: -1 | 1): string {
  if (period === "week") {
    return addDays(anchorDay, 7 * direction);
  }
  if (period === "month") {
    return addMonthsClamped(anchorDay, direction);
  }
  if (period === "year") {
    return addMonthsClamped(anchorDay, 12 * direction);
  }
  return anchorDay;
}

function shortDay(day: string): string {
  const parts = dayParts(day);
  return `${String(parts.day)} ${SHORT_MONTHS[parts.month - 1]}`;
}

export function chartPeriodLabel(period: ChartPeriod, anchorDay: string): string {
  if (period === "week") {
    const days = weekContaining(anchorDay);
    const first = days[0];
    const last = days[6];
    const firstYear = first.slice(0, 4);
    const lastYear = last.slice(0, 4);
    if (firstYear === lastYear) {
      return `${shortDay(first)} – ${shortDay(last)} ${lastYear}`;
    }
    return `${shortDay(first)} ${firstYear} – ${shortDay(last)} ${lastYear}`;
  }
  if (period === "month") {
    return monthLabel(measurementMonth(anchorDay));
  }
  if (period === "year") {
    return anchorDay.slice(0, 4);
  }
  return "All years";
}

export function monthAnchor(month: string, today: string): string {
  if (measurementMonth(today) === month) {
    return today;
  }
  return `${month}-01`;
}

function floorToStep(value: number): number {
  return Math.floor(value / AXIS_STEP) * AXIS_STEP;
}

function ceilToStep(value: number): number {
  return Math.ceil(value / AXIS_STEP) * AXIS_STEP;
}

export function yAxis(values: readonly number[], field: MeasurementField): ChartYAxis | null {
  if (values.length === 0) {
    return null;
  }
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  const limits = measurementLimits[field];
  const lower = Math.max(floorToStep(min) - AXIS_STEP, floorToStep(limits.min));
  const upper = Math.min(ceilToStep(max) + AXIS_STEP, ceilToStep(limits.max));
  const ticks: number[] = [];
  for (let tick = lower; tick <= upper; tick += AXIS_STEP) {
    ticks.push(tick);
  }
  return { domain: [lower, upper], ticks };
}

export function measuredOnMs(measuredOn: string): number {
  const match = MEASURED_ON.exec(measuredOn);
  if (match === null) {
    return Number.NaN;
  }
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || "0"),
    Number(match[5] || "0"),
    Number(match[6] || "0"),
  );
}

type TickUnit = "day" | "monday" | "month";

function floorToUnit(ms: number, unit: TickUnit): number {
  const day = Math.floor(ms / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY;
  if (unit === "day") {
    return day;
  }
  if (unit === "monday") {
    const weekday = new Date(day).getUTCDay();
    return day - ((weekday + 6) % 7) * MILLISECONDS_PER_DAY;
  }
  const date = new Date(day);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function nextOfUnit(ms: number, unit: TickUnit): number {
  if (unit === "day") {
    return ms + MILLISECONDS_PER_DAY;
  }
  if (unit === "monday") {
    return ms + 7 * MILLISECONDS_PER_DAY;
  }
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function periodUnit(period: ChartPeriod): TickUnit {
  if (period === "week") {
    return "day";
  }
  if (period === "month") {
    return "monday";
  }
  return "month";
}

function spanUnit(first: number, last: number): TickUnit {
  const span = last - first;
  if (span <= 7 * MILLISECONDS_PER_DAY) {
    return "day";
  }
  if (span <= 31 * MILLISECONDS_PER_DAY) {
    return "monday";
  }
  return "month";
}

export function xTicks(
  points: readonly number[],
  window: ChartWindow | null,
  period: ChartPeriod | "selected",
): number[] {
  const distinct = [...new Set(points.filter((point) => Number.isFinite(point)))].sort((left, right) => left - right);
  if (distinct.length <= ONE_TICK_PER_ENTRY_LIMIT) {
    return distinct;
  }
  const first = distinct[0];
  const last = distinct[distinct.length - 1];
  const ticks: number[] = [];
  if (period !== "selected" && window !== null) {
    const unit = periodUnit(period);
    const start = measuredOnMs(window.start);
    const end = measuredOnMs(window.end);
    let tick = floorToUnit(start, unit);
    if (tick < start) {
      tick = nextOfUnit(tick, unit);
    }
    for (; tick < end; tick = nextOfUnit(tick, unit)) {
      ticks.push(tick);
    }
    return ticks;
  }
  const unit = period === "selected" ? spanUnit(first, last) : periodUnit(period);
  for (let tick = floorToUnit(first, unit); tick <= last; tick = nextOfUnit(tick, unit)) {
    ticks.push(tick);
  }
  return ticks;
}

export function limitSelection(current: readonly string[], toAdd: readonly string[], limit: number): string[] {
  const selection: string[] = [];
  for (const id of current) {
    if (!selection.includes(id)) {
      selection.push(id);
    }
  }
  for (const id of toAdd) {
    if (selection.length >= limit) {
      break;
    }
    if (!selection.includes(id)) {
      selection.push(id);
    }
  }
  return selection;
}

export function reconcileSelection(ids: readonly string[], foundIds: readonly string[]): string[] {
  const found = new Set(foundIds);
  return ids.filter((id) => found.has(id));
}
