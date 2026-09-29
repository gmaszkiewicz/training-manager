import React, { useState, useSyncExternalStore } from "react";
import { CircleAlert, Plus, Ruler, Scale } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { createMeasurementInputSchema, measurementFields } from "@/lib/measurement-input";
import { cn } from "@/lib/utils";
import type { MeasurementField } from "@/types";

interface Props {
  serverError?: string | null;
}

type ErrorField = "measured_on" | MeasurementField | "note";
type FormErrors = Partial<Record<ErrorField, string>>;

const controlClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";

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

function subscribeToNothing(): () => void {
  return () => undefined;
}

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTodaySnapshot(): string {
  return formatLocalDate(new Date());
}

function emptyTodaySnapshot(): string {
  return "";
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
    <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
      <CircleAlert className="size-3" />
      {message}
    </p>
  );
}

export default function MeasurementForm({ serverError }: Props) {
  // SSR runs in UTC. The input's default and max must be the browser's local calendar date.
  const browserToday = useSyncExternalStore(subscribeToNothing, localTodaySnapshot, emptyTodaySnapshot);
  const [measuredOn, setMeasuredOn] = useState<string | null>(null);
  const [values, setValues] = useState(emptyValues);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const dateValue = measuredOn ?? browserToday;

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
    <form method="POST" action="/api/measurements" className="text-left" onSubmit={handleSubmit} noValidate>
      <div className="border-border bg-card text-card-foreground space-y-4 rounded-2xl border p-8">
        <div>
          <label htmlFor="measured_on" className="text-muted-foreground mb-1 block text-sm">
            Date
          </label>
          <input
            id="measured_on"
            name="measured_on"
            type="date"
            value={dateValue}
            max={browserToday || undefined}
            onChange={(event) => {
              setMeasuredOn(event.target.value);
              clearError("measured_on");
            }}
            className={cn(controlClass, errors.measured_on && "border-destructive")}
          />
          <FieldError message={errors.measured_on} />
        </div>

        {measurementFields.map((field) => (
          <FormField
            key={field.field}
            id={field.field}
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
        ))}

        <div>
          <label htmlFor="note" className="text-muted-foreground mb-1 block text-sm">
            Note
          </label>
          <textarea
            id="note"
            name="note"
            value={note}
            maxLength={1000}
            rows={3}
            onChange={(event) => {
              setNote(event.target.value);
              clearError("note");
            }}
            className={cn(controlClass, errors.note && "border-destructive")}
          />
          <FieldError message={errors.note} />
        </div>

        <ServerError message={serverError} />

        <SubmitButton pendingText="Adding measurement..." icon={<Plus className="size-4" />}>
          Add measurement
        </SubmitButton>
      </div>
    </form>
  );
}
