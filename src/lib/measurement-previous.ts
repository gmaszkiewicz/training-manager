import { measurementFields } from "@/lib/measurement-input";
import type { MeasurementEntry, MeasurementField } from "@/types";

function sortsAfter(entry: MeasurementEntry, selected: MeasurementEntry): boolean {
  if (entry.measured_on > selected.measured_on) {
    return true;
  }
  if (entry.measured_on < selected.measured_on) {
    return false;
  }
  return entry.id > selected.id;
}

export function previousMeasurement(entries: readonly MeasurementEntry[], measuredOn: string): MeasurementEntry | null {
  let selected: MeasurementEntry | null = null;
  for (const entry of entries) {
    if (entry.measured_on >= measuredOn) {
      continue;
    }
    if (selected === null || sortsAfter(entry, selected)) {
      selected = entry;
    }
  }
  return selected;
}

/** Only the measurement values of an entry, so nothing else is serialized into an island prop. */
export function measurementValues(
  entry: Pick<MeasurementEntry, MeasurementField>,
): Pick<MeasurementEntry, MeasurementField> {
  const values = Object.fromEntries(measurementFields.map((definition) => [definition.field, entry[definition.field]]));
  return values as Pick<MeasurementEntry, MeasurementField>;
}

export function measurementFieldValues(
  entry: Pick<MeasurementEntry, MeasurementField> | null,
): Record<MeasurementField, string> {
  return Object.fromEntries(
    measurementFields.map((definition) => [definition.field, entry ? entry[definition.field].toFixed(1) : ""]),
  ) as Record<MeasurementField, string>;
}

export function prefillUntypedFields(
  current: Record<MeasurementField, string>,
  entry: Pick<MeasurementEntry, MeasurementField> | null,
  typed: ReadonlySet<MeasurementField>,
): Record<MeasurementField, string> {
  const prefill = measurementFieldValues(entry);
  const next = { ...current };
  for (const field of Object.keys(prefill) as MeasurementField[]) {
    if (!typed.has(field)) {
      next[field] = prefill[field];
    }
  }
  return next;
}
