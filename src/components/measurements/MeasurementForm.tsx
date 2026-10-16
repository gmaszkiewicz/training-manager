import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  Plus,
  Ruler,
  Scale,
} from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
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

type PreviousRow = Pick<MeasurementEntry, "measured_on" | MeasurementField>;

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

function readPreviousBody(value: unknown): PreviousRow | null {
  if (!isRecord(value) || !isRecord(value.entry)) {
    return null;
  }
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
  return { measured_on, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm };
}

async function fetchMinuteTaken(minute: string): Promise<boolean | null> {
  try {
    const params = new URLSearchParams();
    params.set("measured_on", minute);
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
}: {
  name: "hour" | "minute";
  value: string;
  onChange: (next: string) => void;
  canStep: (next: string) => boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretAtEnd = useRef(false);
  const limit = clockLimit(name);
  const shown = draft ?? value;
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
        className="w-12 px-2 text-center"
        onFocus={(event) => {
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (digits.length === 0) {
            setDraft("");
            return;
          }
          const entered = digits.length > 2 ? digits.slice(-2) : digits;
          const next = typedClock(entered, limit);
          if (next === null) {
            setDraft(entered);
            return;
          }
          if (entered.length === 1) {
            caretAtEnd.current = true;
          }
          if (!canStep(next)) {
            setDraft(entered);
            return;
          }
          apply(next);
          setDraft(next === value ? next : null);
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

function FieldBubble({ id, message, revealed }: { id: string; message: string; revealed: boolean }) {
  return (
    <div
      id={id}
      className={cn(
        "border-border bg-popover text-destructive absolute bottom-full left-0 z-30 mb-2 flex w-max max-w-56 items-start gap-1 rounded-md border px-2 py-1 text-xs shadow-md",
        revealed ? "visible" : "invisible group-focus-within:visible group-hover:visible",
      )}
      aria-live="polite"
    >
      <CircleAlert className="mt-0.5 size-3 shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
      <span
        aria-hidden
        className="border-border bg-popover absolute top-full left-3 size-2 -translate-y-1/2 rotate-45 border-r border-b"
      />
    </div>
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
  const [errorsRevealed, setErrorsRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const duplicateMinute = useRef<string | null>(null);
  const confirmedTaken = useRef<string[]>([]);
  const occupiedRequest = useRef(0);
  const dateValue = measuredOn ?? browserMinute;
  const minuteParts = measuredMinuteParts(dateValue);
  const previewMinute = entry === null ? parseMeasuredOn(dateValue, new Date()) : null;
  const previousEntry = previousForMinute(loadedPrevious, previewMinute);
  const preview = previousEntry === null ? null : previewAgainst(previousEntry, parsedMeasurementFields(values));
  const previousMinuteCaption =
    previousEntry !== null && measurementFields.some((field) => values[field.field].trim() !== "")
      ? `Against ${previousMinuteLabel(previousEntry.measured_on)}`
      : null;
  // The calendar stops at the browser's local minute. SSR uses the UTC minute so hydration matches.
  const ceilingMinute = useSyncExternalStore(subscribeToNothing, localCeilingSnapshot, utcCeilingSnapshot);
  const ceilingDate = ceilingMinute.slice(0, 10);

  useEffect(() => {
    if (previewMinute === null) {
      return;
    }
    const minute = previewMinute;
    let active = true;
    void fetchPreviousMeasurement(minute).then((row) => {
      if (!active) {
        return;
      }
      setLoadedPrevious({ minute, entry: row });
    });
    return () => {
      active = false;
    };
  }, [previewMinute]);

  useEffect(() => {
    if (!dateOpen) {
      return;
    }
    function closeDatePopup() {
      setDateOpen(false);
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

  useEffect(() => {
    if (duplicateMinute.current === null || duplicateMinute.current === dateValue) {
      return;
    }
    duplicateMinute.current = null;
    setErrors((current) =>
      current.measured_on === DUPLICATE_MEASUREMENT_MESSAGE ? { ...current, measured_on: undefined } : current,
    );
  }, [dateValue]);

  useEffect(() => {
    return () => {
      if (revealTimer.current !== null) {
        clearTimeout(revealTimer.current);
      }
    };
  }, []);

  function revealErrorsBriefly() {
    setErrorsRevealed(true);
    if (revealTimer.current !== null) {
      clearTimeout(revealTimer.current);
    }
    revealTimer.current = setTimeout(() => {
      setErrorsRevealed(false);
      revealTimer.current = null;
    }, 3000);
  }

  function clearError(field: ErrorField) {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      return { ...prev, [field]: undefined };
    });
  }

  function rememberTaken(minute: string) {
    const key = toMeasuredOnLocalValue(minute);
    if (confirmedTaken.current.some((value) => toMeasuredOnLocalValue(value) === key)) {
      return;
    }
    confirmedTaken.current = [...confirmedTaken.current, minute];
  }

  function showDuplicate(minute: string) {
    const message = duplicateMeasurementMessage(minute, confirmedTaken.current, entry?.measured_on ?? null);
    duplicateMinute.current = message === null ? null : minute;
    setErrors((current) => {
      if (message !== null) {
        return current.measured_on === message ? current : { ...current, measured_on: message };
      }
      if (current.measured_on !== DUPLICATE_MEASUREMENT_MESSAGE) {
        return current;
      }
      return { ...current, measured_on: undefined };
    });
  }

  function applyDuplicate(minute: string) {
    const request = occupiedRequest.current + 1;
    occupiedRequest.current = request;
    showDuplicate(minute);
    void fetchMinuteTaken(minute).then((taken) => {
      if (occupiedRequest.current !== request) {
        return;
      }
      if (taken === true) {
        rememberTaken(minute);
      }
      showDuplicate(minute);
    });
  }

  function selectMeasuredOn(minute: string) {
    applyDuplicate(minute);
    setMeasuredOn(minute);
    if (allowedMinute(minute, ceilingMinute, entryMinute)) {
      setErrors((current) => {
        if (current.measured_on !== FUTURE_MEASURED_ON_MESSAGE) {
          return current;
        }
        return { ...current, measured_on: undefined };
      });
    }
  }

  function setMeasurementError(field: MeasurementField, value: string) {
    const message = measurementFieldMessage(field, value);
    setErrors((current) => {
      const next = message ?? undefined;
      if (current[field] === next) {
        return current;
      }
      return { ...current, [field]: next };
    });
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setDateOpen(false);
    const duplicate = duplicateMeasurementMessage(dateValue, confirmedTaken.current, entry?.measured_on ?? null);
    const futureDay =
      minuteParts !== null && !allowedMinute(dateValue, ceilingMinute, entryMinute) ? FUTURE_MEASURED_ON_MESSAGE : null;
    const parsed = createMeasurementInputSchema(new Date()).safeParse({
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
        duplicateMinute.current = dateValue;
      }
      setErrors(next);
      revealErrorsBriefly();
      return;
    }
    if (savingRef.current) {
      return;
    }

    const minute = dateValue;
    const action = event.currentTarget.action;
    const body = new FormData();
    body.set("measured_on", minute);
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
          duplicateMinute.current = minute;
          rememberTaken(minute);
          setErrors((current) => ({ ...current, measured_on: DUPLICATE_MEASUREMENT_MESSAGE }));
          revealErrorsBriefly();
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
      <div className="space-y-4">
        <div className="flex flex-nowrap items-start gap-2">
          <div
            ref={dateFieldRef}
            className={cn(
              "group relative w-56 max-w-56 min-w-56 shrink-0 focus-within:z-40 hover:z-40",
              errorsRevealed && errors.measured_on === DUPLICATE_MEASUREMENT_MESSAGE && "z-40",
              dateOpen && errors.measured_on === DUPLICATE_MEASUREMENT_MESSAGE && "z-40",
            )}
          >
            <div className="relative z-20">
              {errors.measured_on === DUPLICATE_MEASUREMENT_MESSAGE ? (
                <FieldBubble
                  id={`${idPrefix}measured_on-error`}
                  message={DUPLICATE_MEASUREMENT_MESSAGE}
                  revealed={errorsRevealed || dateOpen}
                />
              ) : null}
              <Label htmlFor={`${idPrefix}measured_on`} className="text-muted-foreground mb-1">
                Date and time
              </Label>
              <div className="relative">
                <Calendar
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Button
                  type="button"
                  id={`${idPrefix}measured_on`}
                  variant="outline"
                  className={cn("w-full justify-start pl-10")}
                  aria-expanded={dateOpen}
                  aria-invalid={errors.measured_on ? true : undefined}
                  aria-describedby={
                    errors.measured_on === DUPLICATE_MEASUREMENT_MESSAGE ? `${idPrefix}measured_on-error` : undefined
                  }
                  onClick={() => {
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
                    "bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-max flex-col gap-2 rounded-md border p-2 shadow-md",
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
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <FieldError
              message={errors.measured_on === DUPLICATE_MEASUREMENT_MESSAGE ? undefined : errors.measured_on}
            />
            {entry === null ? (
              <p
                className="text-card-foreground mt-1 min-h-lh text-sm font-semibold whitespace-nowrap"
                aria-hidden={previousMinuteCaption ? undefined : true}
              >
                {previousMinuteCaption ?? "\u00a0"}
              </p>
            ) : null}
          </div>

          {measurementFields.map((field) => {
            const delta = preview ? preview[field.field] : null;
            const arrow = delta ? deltaArrow(delta) : null;
            const message = errors[field.field];
            const bubbleId = `${idPrefix}${field.field}-error`;
            return (
              <div
                key={field.field}
                className={cn(
                  "group relative w-28 max-w-28 min-w-28 shrink-0 focus-within:z-40 hover:z-40 [&_p]:block [&_p]:break-words",
                  errorsRevealed && "z-40",
                )}
              >
                {message ? <FieldBubble id={bubbleId} message={message} revealed={errorsRevealed} /> : null}
                <FormField
                  id={`${idPrefix}${field.field}`}
                  name={field.field}
                  type="number"
                  step="0.1"
                  label={`${field.label} ${field.unit}`}
                  value={values[field.field]}
                  onChange={(value) => {
                    setValues((current) => ({ ...current, [field.field]: value }));
                    setMeasurementError(field.field, value);
                  }}
                  onBlur={(event) => {
                    setMeasurementError(field.field, event.currentTarget.value);
                  }}
                  invalid={Boolean(message)}
                  describedBy={message ? bubbleId : undefined}
                  icon={field.unit === "kg" ? <Scale className="size-4" /> : <Ruler className="size-4" />}
                />
                {entry === null ? (
                  <p
                    className="text-card-foreground relative mt-1 min-h-lh text-sm font-semibold"
                    aria-hidden={delta ? undefined : true}
                    aria-label={delta ? accessibleDelta(field.label, field.unit, delta) : undefined}
                  >
                    {delta ? (
                      <>
                        {arrow ? (
                          <span
                            aria-hidden
                            className="absolute top-1/2 left-3 flex size-4 -translate-y-1/2 items-center justify-center"
                          >
                            {arrow}
                          </span>
                        ) : null}
                        <span aria-hidden className="block pl-10">
                          {delta.difference.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      "\u00a0"
                    )}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="w-0 min-w-full">
          <Label htmlFor={`${idPrefix}note`} className="text-muted-foreground mb-1">
            Note
          </Label>
          <Textarea
            id={`${idPrefix}note`}
            name="note"
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            rows={3}
            className="field-sizing-fixed"
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

        <ServerError message={submitError ?? (serverError === DUPLICATE_MEASUREMENT_MESSAGE ? null : serverError)} />

        <SubmitButton
          pendingText={entry ? "Saving measurement..." : "Adding measurement..."}
          icon={<Plus className="size-4" />}
          forcePending={saving}
        >
          {entry ? "Save measurement" : "Add measurement"}
        </SubmitButton>
        {entry ? (
          <a href="/measurements" className="text-primary focus-visible:ring-ring hover:underline focus-visible:ring-2">
            Cancel
          </a>
        ) : null}
      </div>
    </form>
  );
}
