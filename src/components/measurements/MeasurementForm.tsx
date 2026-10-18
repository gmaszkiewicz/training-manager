import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  Plus,
} from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ERROR_TOAST_MS, ErrorToastCard } from "@/components/measurements/ErrorToastCard";
import MonthGrid from "@/components/measurements/MonthGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { monthGrid, monthLabel } from "@/lib/journal-calendar";
import { previewAgainst } from "@/lib/measurement-deltas";
import {
  createMeasurementInputSchema,
  DUPLICATE_MEASUREMENT_MESSAGE,
  duplicateMeasurementMessage,
  NOTE_MAX_LENGTH,
  measurementFieldMessage,
  measurementFieldRange,
  measuredOnPartRange,
  measurementFields,
  parseMeasuredOn,
  parseMeasurementField,
  toMeasuredOnLocalValue,
} from "@/lib/measurement-input";
import { cn } from "@/lib/utils";
import type { FieldDelta, MeasurementEntry, MeasurementField } from "@/types";

interface Props {
  serverError?: string | null;
  idPrefix?: string;
  entry?: MeasurementEntry | null;
}

type ErrorField = "measured_on" | MeasurementField | "note";
type FormErrors = Partial<Record<ErrorField, string>>;

const emptyValues: Record<MeasurementField, string> = {
  weight_kg: "",
  chest_cm: "",
  waist_cm: "",
  arms_cm: "",
  thigh_cm: "",
  calf_cm: "",
  hips_cm: "",
  navel_cm: "",
};

function fieldValues(entry: MeasurementEntry): Record<MeasurementField, string> {
  return {
    weight_kg: entry.weight_kg.toFixed(1),
    chest_cm: entry.chest_cm.toFixed(1),
    waist_cm: entry.waist_cm.toFixed(1),
    arms_cm: entry.arms_cm.toFixed(1),
    thigh_cm: entry.thigh_cm.toFixed(1),
    calf_cm: entry.calf_cm.toFixed(1),
    hips_cm: entry.hips_cm.toFixed(1),
    navel_cm: entry.navel_cm.toFixed(1),
  };
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function formatLocalMinute(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function localMinuteSnapshot(): string {
  return formatLocalMinute(new Date());
}

function emptyTodaySnapshot(): string {
  return "";
}

const FUTURE_MEASURED_ON_MESSAGE = "Date and time must not be later than now";

function formatUtcMinute(date: Date): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function localCeilingSnapshot(): string {
  return formatLocalMinute(new Date());
}

function utcCeilingSnapshot(): string {
  return formatUtcMinute(new Date());
}

function allowedMinute(minute: string, ceilingMinute: string, editingMinute: string | null): boolean {
  return minute <= ceilingMinute || minute === editingMinute;
}

const MEASURED_MINUTE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

function measuredMinuteParts(value: string): { day: string; time: string } | null {
  const match = MEASURED_MINUTE.exec(value);
  if (match === null) {
    return null;
  }
  return { day: match[1], time: match[2] };
}

function daysAfterCeiling(month: string, ceilingDate: string): ReadonlySet<string> {
  return new Set(monthGrid(month).filter((day) => day > ceilingDate));
}

function stepClock(value: string, delta: number, limit: number): string {
  const next = (Number(value) + delta + limit) % limit;
  return String(next).padStart(2, "0");
}

function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  const nextYear = String(shifted.getUTCFullYear());
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function monthStartsAfterCeiling(month: string, ceilingDate: string): boolean {
  return `${month}-01` > ceilingDate;
}

function isErrorField(value: PropertyKey): value is ErrorField {
  if (value === "measured_on" || value === "note") {
    return true;
  }
  return measurementFields.some((field) => field.field === value);
}

type PreviousRow = Pick<MeasurementEntry, "id" | "measured_on" | MeasurementField>;

interface LoadedPrevious {
  minute: string;
  entry: PreviousRow | null;
}

function accessibleDelta(label: string, unit: string, delta: FieldDelta): string {
  const direction = delta.direction === "none" ? "unchanged" : delta.direction;
  return `${label} ${direction} ${delta.difference.toFixed(1)} ${unit}`;
}

function deltaArrow(delta: FieldDelta): string | null {
  if (delta.direction === "up") {
    return "↑";
  }
  if (delta.direction === "down") {
    return "↓";
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function readMeasuredOn(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  return value;
}

function previousMinuteLabel(measuredOn: string): string {
  const local = toMeasuredOnLocalValue(measuredOn);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (match === null) {
    return local.replace("T", " ");
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formDeltaText(delta: FieldDelta | null): { text: string; muted: boolean } {
  if (delta === null) {
    return { text: "\u2014", muted: true };
  }
  if (delta.direction === "none") {
    return { text: "0.0", muted: true };
  }
  const arrow = deltaArrow(delta);
  return {
    text: arrow === null ? delta.difference.toFixed(1) : `${arrow} ${delta.difference.toFixed(1)}`,
    muted: false,
  };
}

function readPreviousBody(value: unknown): PreviousRow | null {
  if (!isRecord(value) || !isRecord(value.entry)) {
    return null;
  }
  const id = typeof value.entry.id === "string" && value.entry.id.length > 0 ? value.entry.id : null;
  const measured_on = readMeasuredOn(value.entry.measured_on);
  const weight_kg = readFiniteNumber(value.entry.weight_kg);
  const chest_cm = readFiniteNumber(value.entry.chest_cm);
  const waist_cm = readFiniteNumber(value.entry.waist_cm);
  const arms_cm = readFiniteNumber(value.entry.arms_cm);
  const thigh_cm = readFiniteNumber(value.entry.thigh_cm);
  const calf_cm = readFiniteNumber(value.entry.calf_cm);
  const hips_cm = readFiniteNumber(value.entry.hips_cm);
  const navel_cm = readFiniteNumber(value.entry.navel_cm);
  if (
    id === null ||
    measured_on === null ||
    weight_kg === null ||
    chest_cm === null ||
    waist_cm === null ||
    arms_cm === null ||
    thigh_cm === null ||
    calf_cm === null ||
    hips_cm === null ||
    navel_cm === null
  ) {
    return null;
  }
  return { id, measured_on, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm };
}

function browserUtcOffsetMinutes(): number {
  return new Date().getTimezoneOffset();
}

async function fetchMinuteTaken(minute: string): Promise<boolean | null> {
  try {
    const params = new URLSearchParams();
    params.set("measured_on", minute);
    params.set("utc_offset_minutes", String(browserUtcOffsetMinutes()));
    const response = await fetch(`/api/measurements/occupied?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    if (!isRecord(payload) || typeof payload.taken !== "boolean") {
      return null;
    }
    return payload.taken;
  } catch {
    return null;
  }
}

function previousMeasurementUrl(minute: string): string {
  const params = new URLSearchParams();
  params.set("measured_on", minute);
  params.set("utc_offset_minutes", String(browserUtcOffsetMinutes()));
  return `/api/measurements/previous?${params.toString()}`;
}

async function fetchPreviousMeasurement(minute: string): Promise<PreviousRow | null> {
  try {
    const response = await fetch(previousMeasurementUrl(minute), { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return readPreviousBody(payload);
  } catch {
    return null;
  }
}

async function fetchPreviewBaseline(minute: string, editingId: string | null): Promise<PreviousRow | null> {
  const row = await fetchPreviousMeasurement(minute);
  if (row === null || editingId === null || row.id !== editingId) {
    return row;
  }
  const earlier = await fetchPreviousMeasurement(row.measured_on);
  if (earlier === null || earlier.id === editingId) {
    return null;
  }
  return earlier;
}

function previousForMinute(loaded: LoadedPrevious | null, minute: string | null): PreviousRow | null {
  if (loaded === null || minute === null || loaded.minute !== minute) {
    return null;
  }
  return loaded.entry;
}

function parsedMeasurementFields(values: Record<MeasurementField, string>): Partial<Record<MeasurementField, number>> {
  const current: Partial<Record<MeasurementField, number>> = {};
  for (const field of measurementFields) {
    const parsed = parseMeasurementField(field.field, values[field.field]);
    if (parsed !== null) {
      current[field.field] = parsed;
    }
  }
  return current;
}

function errorsFor(issues: { path: PropertyKey[]; message: string }[]): FormErrors {
  const next: FormErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (isErrorField(field) && next[field] === undefined) {
      next[field] = issue.message;
    }
  }
  return next;
}

function CalendarMonth({
  month,
  ceilingDate,
  onMonthChange,
}: {
  month: string;
  ceilingDate: string;
  onMonthChange: (month: string) => void;
}) {
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const previousYear = shiftMonth(month, -12);
  const nextYear = shiftMonth(month, 12);

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Calendar month">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous year"
        onClick={() => {
          onMonthChange(previousYear);
        }}
      >
        <ChevronsLeft aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => {
          onMonthChange(previousMonth);
        }}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span className="min-w-0 flex-1 text-center text-sm">{monthLabel(month)}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next month"
        disabled={monthStartsAfterCeiling(nextMonth, ceilingDate)}
        onClick={() => {
          onMonthChange(nextMonth);
        }}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next year"
        disabled={monthStartsAfterCeiling(nextYear, ceilingDate)}
        onClick={() => {
          onMonthChange(nextYear);
        }}
      >
        <ChevronsRight aria-hidden="true" />
      </Button>
    </div>
  );
}

function clockLimit(name: "hour" | "minute"): number {
  return name === "hour" ? 24 : 60;
}

function typedClock(text: string, limit: number): string | null {
  if (!/^\d{1,2}$/.test(text)) {
    return null;
  }
  const number = Number(text);
  if (number >= limit) {
    return null;
  }
  return String(number).padStart(2, "0");
}

function ClockPart({
  name,
  value,
  onChange,
  canStep,
  onInvalidDraft,
}: {
  name: "hour" | "minute";
  value: string;
  onChange: (next: string) => void;
  canStep: (next: string) => boolean;
  onInvalidDraft: (invalid: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretAtEnd = useRef(false);
  const limit = clockLimit(name);
  const shown = draft ?? value;
  const parsedDraft = draft === null || draft === "" ? null : typedClock(draft, limit);
  const draftInvalid = draft !== null && draft !== "" && (parsedDraft === null || !canStep(parsedDraft));
  const nextValue = stepClock(value, 1, limit);
  const previousValue = stepClock(value, -1, limit);

  useEffect(() => {
    if (!caretAtEnd.current) {
      return;
    }
    caretAtEnd.current = false;
    const input = inputRef.current;
    if (input === null || document.activeElement !== input) {
      return;
    }
    const end = input.value.length;
    input.setSelectionRange(end, end);
  });

  function apply(next: string) {
    if (next === value || !canStep(next)) {
      return;
    }
    onChange(next);
  }

  function commit(text: string) {
    const next = typedClock(text, limit);
    if (next !== null) {
      apply(next);
    }
    setDraft(null);
    onInvalidDraft(false);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Next ${name}`}
        disabled={!canStep(nextValue)}
        onClick={() => {
          setDraft(null);
          onInvalidDraft(false);
          apply(nextValue);
        }}
      >
        <ChevronUp aria-hidden="true" />
      </Button>
      <Input
        ref={inputRef}
        aria-label={name === "hour" ? "Hour" : "Minute"}
        inputMode="numeric"
        maxLength={3}
        value={shown}
        aria-invalid={draftInvalid || undefined}
        className="w-12 px-2 text-center"
        onFocus={(event) => {
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (digits.length === 0) {
            setDraft("");
            onInvalidDraft(false);
            return;
          }
          const entered = digits.length > 2 ? digits.slice(-2) : digits;
          const next = typedClock(entered, limit);
          if (next === null || !canStep(next)) {
            setDraft(entered);
            onInvalidDraft(true);
            return;
          }
          if (entered.length === 1) {
            caretAtEnd.current = true;
          }
          apply(next);
          setDraft(next === value ? next : null);
          onInvalidDraft(false);
        }}
        onBlur={() => {
          commit(shown);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Previous ${name}`}
        disabled={!canStep(previousValue)}
        onClick={() => {
          setDraft(null);
          onInvalidDraft(false);
          apply(previousValue);
        }}
      >
        <ChevronDown aria-hidden="true" />
      </Button>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-destructive mt-1 flex flex-wrap items-start gap-1 text-xs break-words">
      <CircleAlert className="mt-0.5 size-3 shrink-0" />
      {message}
    </p>
  );
}

function FieldErrorToasts({
  items,
  onDismiss,
}: {
  items: { id: string; message: string }[];
  onDismiss: (id: string) => void;
}) {
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const timers = useRef(new Map<string, number>());
  const onDismissRef = useRef(onDismiss);
  const toastIds = items.map((item) => item.id).join("\n");

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const visible = new Set(toastIds.length === 0 ? [] : toastIds.split("\n"));
    for (const [id, timer] of timers.current) {
      if (!visible.has(id)) {
        window.clearTimeout(timer);
        timers.current.delete(id);
      }
    }
    for (const id of visible) {
      if (timers.current.has(id)) {
        continue;
      }
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          onDismissRef.current(id);
        }, ERROR_TOAST_MS),
      );
    }
  }, [toastIds]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) {
        window.clearTimeout(timer);
      }
      active.clear();
    };
  }, []);

  if (!onClient || items.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} id={item.id}>
          <ErrorToastCard
            message={item.message}
            onDismiss={() => {
              onDismiss(item.id);
            }}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}

export default function MeasurementForm({ serverError, idPrefix = "", entry = null }: Props) {
  // SSR runs in UTC. A new entry defaults to the browser's local minute.
  const browserMinute = useSyncExternalStore(subscribeToNothing, localMinuteSnapshot, emptyTodaySnapshot);
  const entryMinute = entry ? toMeasuredOnLocalValue(entry.measured_on) : null;
  const [measuredOn, setMeasuredOn] = useState<string | null>(entryMinute);
  const [values, setValues] = useState(entry ? fieldValues(entry) : emptyValues);
  const [note, setNote] = useState(entry?.note ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadedPrevious, setLoadedPrevious] = useState<LoadedPrevious | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [gridMonth, setGridMonth] = useState<string | null>(null);
  const [clockHint, setClockHint] = useState<"hour" | "minute" | null>(null);
  const [dismissedErrors, setDismissedErrors] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const confirmedTaken = useRef<string[]>([]);
  const occupiedRequest = useRef(0);
  const dateValue = measuredOn ?? browserMinute;
  const minuteParts = measuredMinuteParts(dateValue);
  const editingId = entry?.id ?? null;
  const previewMinute = parseMeasuredOn(dateValue, new Date(), browserUtcOffsetMinutes());
  const previousEntry = previousForMinute(loadedPrevious, previewMinute);
  const preview = previousEntry === null ? null : previewAgainst(previousEntry, parsedMeasurementFields(values));
  const previousMinuteCaption =
    previousEntry !== null && measurementFields.some((field) => values[field.field].trim() !== "")
      ? `Against ${previousMinuteLabel(previousEntry.measured_on)}`
      : null;
  const errorToasts = measurementFields.flatMap((field) => {
    const message = errors[field.field];
    const id = `${idPrefix}${field.field}-error`;
    if (message === undefined || dismissedErrors.has(id)) {
      return [];
    }
    return [{ id, message }];
  });
  if (errors.measured_on === DUPLICATE_MEASUREMENT_MESSAGE && !dismissedErrors.has(`${idPrefix}measured_on-error`)) {
    errorToasts.unshift({ id: `${idPrefix}measured_on-error`, message: DUPLICATE_MEASUREMENT_MESSAGE });
  }
  // The calendar stops at the browser's local minute. SSR uses the UTC minute so hydration matches.
  const ceilingMinute = useSyncExternalStore(subscribeToNothing, localCeilingSnapshot, utcCeilingSnapshot);
  const ceilingDate = ceilingMinute.slice(0, 10);
  const dateRange =
    clockHint !== null && minuteParts !== null
      ? measuredOnPartRange(clockHint, minuteParts.day, minuteParts.time, ceilingMinute)
      : null;
  const dateSlotText = dateRange ?? previousMinuteCaption ?? "\u2014";
  const dateSlotMuted = dateRange !== null || previousMinuteCaption === null;
  const dateSlotLabel =
    dateRange !== null && clockHint !== null ? `${clockHint === "hour" ? "Hour" : "Minute"} ${dateRange}` : undefined;

  useEffect(() => {
    if (previewMinute === null) {
      return;
    }
    const minute = previewMinute;
    let active = true;
    void fetchPreviewBaseline(minute, editingId).then((row) => {
      if (!active) {
        return;
      }
      setLoadedPrevious({ minute, entry: row });
    });
    return () => {
      active = false;
    };
  }, [previewMinute, editingId]);

  useEffect(() => {
    if (!dateOpen) {
      return;
    }
    function closeDatePopup() {
      setDateOpen(false);
      setClockHint(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDatePopup();
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || dateFieldRef.current?.contains(target)) {
        return;
      }
      closeDatePopup();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [dateOpen]);

  function clearError(field: ErrorField) {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      return { ...prev, [field]: undefined };
    });
  }

  function errorFieldForToast(id: string): ErrorField | null {
    const marker = "-error";
    if (!id.startsWith(idPrefix) || !id.endsWith(marker)) {
      return null;
    }
    const field = id.slice(idPrefix.length, id.length - marker.length);
    return isErrorField(field) ? field : null;
  }

  function dismissErrorToast(id: string) {
    setDismissedErrors((current) => {
      if (current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.add(id);
      return next;
    });
    const field = errorFieldForToast(id);
    if (field !== null) {
      clearError(field);
    }
  }

  function releaseErrorToast(id: string) {
    setDismissedErrors((current) => {
      if (!current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function rememberTaken(minute: string) {
    const key = toMeasuredOnLocalValue(minute);
    if (confirmedTaken.current.some((value) => toMeasuredOnLocalValue(value) === key)) {
      return;
    }
    confirmedTaken.current = [...confirmedTaken.current, minute];
  }

  function applyDuplicate(minute: string) {
    const request = occupiedRequest.current + 1;
    occupiedRequest.current = request;
    void fetchMinuteTaken(minute).then((taken) => {
      if (occupiedRequest.current !== request) {
        return;
      }
      if (taken === true) {
        rememberTaken(minute);
      }
    });
  }

  function selectMeasuredOn(minute: string) {
    applyDuplicate(minute);
    setMeasuredOn(minute);
    if (minute !== dateValue) {
      clearError("measured_on");
      releaseErrorToast(`${idPrefix}measured_on-error`);
    }
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setDateOpen(false);
    const duplicate = duplicateMeasurementMessage(dateValue, confirmedTaken.current, entry?.measured_on ?? null);
    const futureDay =
      minuteParts !== null && !allowedMinute(dateValue, ceilingMinute, entryMinute) ? FUTURE_MEASURED_ON_MESSAGE : null;
    const utcOffsetMinutes = browserUtcOffsetMinutes();
    const parsed = createMeasurementInputSchema(new Date(), utcOffsetMinutes).safeParse({
      measured_on: dateValue,
      weight_kg: values.weight_kg,
      chest_cm: values.chest_cm,
      waist_cm: values.waist_cm,
      arms_cm: values.arms_cm,
      thigh_cm: values.thigh_cm,
      calf_cm: values.calf_cm,
      hips_cm: values.hips_cm,
      navel_cm: values.navel_cm,
      note,
    });

    if (!parsed.success || duplicate !== null || futureDay !== null) {
      const next = parsed.success ? {} : errorsFor(parsed.error.issues);
      if (futureDay !== null) {
        next.measured_on = futureDay;
      }
      if (duplicate !== null) {
        next.measured_on = duplicate;
      }
      setErrors(next);
      setDismissedErrors(new Set());
      return;
    }
    if (savingRef.current) {
      return;
    }

    const minute = dateValue;
    const action = event.currentTarget.action;
    const body = new FormData();
    body.set("measured_on", minute);
    body.set("utc_offset_minutes", String(utcOffsetMinutes));
    for (const field of measurementFields) {
      body.set(field.field, values[field.field]);
    }
    body.set("note", note);
    savingRef.current = true;
    setSaving(true);
    setSubmitError(null);
    void fetch(action, { method: "POST", body, headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { ok?: unknown; error?: unknown } | null;
        const error = typeof payload?.error === "string" ? payload.error : null;
        if (response.status === 409 && error === DUPLICATE_MEASUREMENT_MESSAGE) {
          rememberTaken(minute);
          setErrors((current) => ({ ...current, measured_on: DUPLICATE_MEASUREMENT_MESSAGE }));
          setDismissedErrors(new Set());
          savingRef.current = false;
          setSaving(false);
          return;
        }
        if (response.ok && payload?.ok === true && !response.redirected) {
          window.location.assign("/measurements");
          return;
        }
        savingRef.current = false;
        setSaving(false);
        setSubmitError(error ?? "Could not save the measurement");
      })
      .catch(() => {
        savingRef.current = false;
        setSaving(false);
        setSubmitError("Could not save the measurement");
      });
  }

  return (
    <form
      method="POST"
      action={entry ? `/api/measurements/${entry.id}` : "/api/measurements"}
      className="text-left"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="w-full max-w-full min-w-0 space-y-3">
        <div className="measurement-row:flex-row measurement-row:flex-nowrap measurement-row:gap-0 flex flex-col items-start gap-3">
          <div
            ref={dateFieldRef}
            className="group measurement-row:w-[9.75rem] measurement-row:max-w-[9.75rem] measurement-row:shrink-0 relative w-full min-w-0 focus-within:z-40 hover:z-40"
          >
            <div className="relative z-20">
              <Label htmlFor={`${idPrefix}measured_on`} className="text-muted-foreground mb-1">
                Date and time
              </Label>
              <div className="relative">
                <Button
                  type="button"
                  id={`${idPrefix}measured_on`}
                  variant="outline"
                  className="h-9 w-full justify-start px-3"
                  aria-expanded={dateOpen}
                  aria-invalid={
                    errors.measured_on && !dismissedErrors.has(`${idPrefix}measured_on-error`) ? true : undefined
                  }
                  aria-describedby={
                    errorToasts.some((item) => item.id === `${idPrefix}measured_on-error`)
                      ? `${idPrefix}measured_on-error`
                      : undefined
                  }
                  onClick={() => {
                    setClockHint(null);
                    setDateOpen((open) => {
                      if (open) {
                        return false;
                      }
                      if (minuteParts !== null) {
                        setGridMonth(minuteParts.day.slice(0, 7));
                      }
                      return true;
                    });
                    applyDuplicate(dateValue);
                  }}
                >
                  {dateValue.replace("T", " ")}
                </Button>
              </div>
              <input type="hidden" name="measured_on" value={dateValue} />
              {dateOpen && minuteParts !== null ? (
                <div
                  className={cn(
                    "bg-popover text-popover-foreground border-border measurement-row:max-w-none absolute top-full left-0 z-10 mt-2 flex w-max max-w-full flex-col gap-2 rounded-md border p-2 shadow-md",
                  )}
                >
                  <CalendarMonth
                    month={gridMonth ?? minuteParts.day.slice(0, 7)}
                    ceilingDate={ceilingDate}
                    onMonthChange={setGridMonth}
                  />
                  <MonthGrid
                    month={gridMonth ?? minuteParts.day.slice(0, 7)}
                    selectedDay={minuteParts.day}
                    disabledDays={daysAfterCeiling(gridMonth ?? minuteParts.day.slice(0, 7), ceilingDate)}
                    onDaySelect={(day) => {
                      if (day > ceilingDate) {
                        return;
                      }
                      setGridMonth(day.slice(0, 7));
                      const kept = `${day}T${minuteParts.time}`;
                      selectMeasuredOn(allowedMinute(kept, ceilingMinute, entryMinute) ? kept : ceilingMinute);
                    }}
                  />
                  <div className="flex items-center justify-center gap-2" role="group" aria-label="Time">
                    <ClockPart
                      name="hour"
                      value={minuteParts.time.slice(0, 2)}
                      canStep={(hour) =>
                        allowedMinute(
                          `${minuteParts.day}T${hour}:${minuteParts.time.slice(3)}`,
                          ceilingMinute,
                          entryMinute,
                        )
                      }
                      onChange={(hour) => {
                        selectMeasuredOn(`${minuteParts.day}T${hour}:${minuteParts.time.slice(3)}`);
                      }}
                      onInvalidDraft={(invalid) => {
                        setClockHint((current) => (invalid ? "hour" : current === "hour" ? null : current));
                      }}
                    />
                    <span aria-hidden className="text-sm font-medium">
                      :
                    </span>
                    <ClockPart
                      name="minute"
                      value={minuteParts.time.slice(3)}
                      canStep={(minute) =>
                        allowedMinute(
                          `${minuteParts.day}T${minuteParts.time.slice(0, 2)}:${minute}`,
                          ceilingMinute,
                          entryMinute,
                        )
                      }
                      onChange={(minute) => {
                        selectMeasuredOn(`${minuteParts.day}T${minuteParts.time.slice(0, 2)}:${minute}`);
                      }}
                      onInvalidDraft={(invalid) => {
                        setClockHint((current) => (invalid ? "minute" : current === "minute" ? null : current));
                      }}
                    />
                  </div>
                  {dateRange !== null ? (
                    <p className="text-muted-foreground min-h-lh text-center text-xs" aria-label={dateSlotLabel}>
                      {dateRange}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <FieldError
              message={errors.measured_on === DUPLICATE_MEASUREMENT_MESSAGE ? undefined : errors.measured_on}
            />
            <p
              className={cn(
                "mt-1 min-h-lh text-center text-xs",
                dateSlotMuted ? "text-muted-foreground" : "text-card-foreground",
              )}
              aria-label={dateSlotLabel}
            >
              {dateSlotText}
            </p>
          </div>

          <div className="measurement-row:contents flex w-full min-w-0 gap-0 overflow-x-auto">
            {measurementFields.map((field) => {
              const delta = preview ? preview[field.field] : null;
              const message = errors[field.field];
              const toastId = `${idPrefix}${field.field}-error`;
              const typed = values[field.field];
              const showRange = typed.trim() !== "" && measurementFieldMessage(field.field, typed) !== null;
              const slot = showRange ? { text: measurementFieldRange(field.field), muted: true } : formDeltaText(delta);
              return (
                <div
                  key={field.field}
                  className="group measurement-row:w-[5.5rem] measurement-row:max-w-[5.5rem] measurement-row:shrink-0 relative w-[5.5625rem] max-w-[5.5625rem] shrink-0 px-1 focus-within:z-40 hover:z-40"
                >
                  <FormField
                    id={`${idPrefix}${field.field}`}
                    name={field.field}
                    type="number"
                    step="0.1"
                    label={`${field.label} ${field.unit}`}
                    value={typed}
                    onChange={(value) => {
                      setValues((current) => ({ ...current, [field.field]: value }));
                      clearError(field.field);
                      releaseErrorToast(toastId);
                    }}
                    invalid={(Boolean(message) || showRange) && !dismissedErrors.has(toastId)}
                    describedBy={message !== undefined && !dismissedErrors.has(toastId) ? toastId : undefined}
                  />
                  <p
                    className={cn(
                      "mt-1 min-h-lh text-center text-xs",
                      slot.muted ? "text-muted-foreground" : "text-card-foreground",
                    )}
                    aria-label={
                      showRange
                        ? `${field.label} ${measurementFieldRange(field.field)} ${field.unit}`
                        : delta
                          ? accessibleDelta(field.label, field.unit, delta)
                          : undefined
                    }
                  >
                    {slot.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-full min-w-0">
          <Label htmlFor={`${idPrefix}note`} className="text-muted-foreground mb-1">
            Note
          </Label>
          <Textarea
            id={`${idPrefix}note`}
            name="note"
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            rows={3}
            className="bg-background ![field-sizing:fixed] h-18 min-h-18 w-full max-w-full"
            onChange={(event) => {
              setNote(event.target.value);
              clearError("note");
            }}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={`${idPrefix}note-count`}
          />
          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1 [&_p]:mt-0">
              <FieldError message={errors.note} />
            </div>
            <p id={`${idPrefix}note-count`} className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {note.length}/{NOTE_MAX_LENGTH}
            </p>
          </div>
        </div>

        <FieldErrorToasts items={errorToasts} onDismiss={dismissErrorToast} />
        <ServerError message={submitError ?? (serverError === DUPLICATE_MEASUREMENT_MESSAGE ? null : serverError)} />

        <div className={entry ? "flex gap-2" : undefined}>
          <SubmitButton
            pendingText={entry ? "Saving measurement..." : "Adding measurement..."}
            icon={<Plus className="size-4" />}
            forcePending={saving}
            className={entry ? "h-10 w-auto flex-1 rounded-lg" : "h-10 rounded-lg"}
          >
            {entry ? "Save measurement" : "Add measurement"}
          </SubmitButton>
          {entry ? (
            <Button asChild className="h-10 flex-1 rounded-lg">
              <a href="/measurements">Cancel</a>
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
