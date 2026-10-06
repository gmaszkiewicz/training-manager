import React, { useState, useSyncExternalStore } from "react";
import { CircleAlert, Plus, Ruler, Scale } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createMeasurementInputSchema,
  measuredOnMax,
  measurementFields,
  toMeasuredOnLocalValue,
} from "@/lib/measurement-input";
import type { MeasurementEntry, MeasurementField } from "@/types";

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

function laterDate(left: string, right: string): string {
  if (left === "") {
    return right;
  }
  if (right === "") {
    return left;
  }
  return left > right ? left : right;
}

function isErrorField(value: PropertyKey): value is ErrorField {
  if (value === "measured_on" || value === "note") {
    return true;
  }
  return measurementFields.some((field) => field.field === value);
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

export default function MeasurementForm({ serverError, idPrefix = "", entry = null }: Props) {
  // SSR runs in UTC. A new entry defaults to the browser's local minute.
  const browserMinute = useSyncExternalStore(subscribeToNothing, localMinuteSnapshot, emptyTodaySnapshot);
  const entryMinute = entry ? toMeasuredOnLocalValue(entry.measured_on) : null;
  const [measuredOn, setMeasuredOn] = useState<string | null>(entryMinute);
  const [values, setValues] = useState(entry ? fieldValues(entry) : emptyValues);
  const [note, setNote] = useState(entry?.note ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const dateValue = measuredOn ?? browserMinute;
  const ceiling = measuredOnMax(new Date());
  const dateMax = entryMinute ? laterDate(ceiling, entryMinute) : ceiling;

  function clearError(field: ErrorField) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
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

    if (!parsed.success) {
      event.preventDefault();
      setErrors(errorsFor(parsed.error.issues));
    }
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
          <div className="w-56 max-w-56 min-w-56 shrink-0">
            <Label htmlFor={`${idPrefix}measured_on`} className="text-muted-foreground mb-1">
              Date and time
            </Label>
            <Input
              id={`${idPrefix}measured_on`}
              name="measured_on"
              type="datetime-local"
              step="60"
              value={dateValue}
              max={dateMax || undefined}
              onChange={(event) => {
                setMeasuredOn(event.target.value);
                clearError("measured_on");
              }}
              aria-invalid={errors.measured_on ? true : undefined}
              className="relative px-2 pr-7 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <FieldError message={errors.measured_on} />
          </div>

          {measurementFields.map((field) => (
            <div key={field.field} className="w-28 max-w-28 min-w-28 shrink-0 [&_p]:block [&_p]:break-words">
              <FormField
                id={`${idPrefix}${field.field}`}
                name={field.field}
                type="number"
                step="0.1"
                label={`${field.label} ${field.unit}`}
                value={values[field.field]}
                onChange={(value) => {
                  setValues((current) => ({ ...current, [field.field]: value }));
                  clearError(field.field);
                }}
                error={errors[field.field]}
                icon={field.unit === "kg" ? <Scale className="size-4" /> : <Ruler className="size-4" />}
              />
            </div>
          ))}
        </div>

        <div className="w-0 min-w-full">
          <Label htmlFor={`${idPrefix}note`} className="text-muted-foreground mb-1">
            Note
          </Label>
          <Textarea
            id={`${idPrefix}note`}
            name="note"
            value={note}
            maxLength={1000}
            rows={3}
            className="field-sizing-fixed"
            onChange={(event) => {
              setNote(event.target.value);
              clearError("note");
            }}
            aria-invalid={errors.note ? true : undefined}
          />
          <FieldError message={errors.note} />
        </div>

        <ServerError message={serverError} />

        <SubmitButton
          pendingText={entry ? "Saving measurement..." : "Adding measurement..."}
          icon={<Plus className="size-4" />}
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
