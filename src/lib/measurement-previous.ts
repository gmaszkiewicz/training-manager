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

export function measurementFieldValues(
  entry: Pick<MeasurementEntry, MeasurementField> | null,
): Record<MeasurementField, string> {
  return {
    weight_kg: entry ? entry.weight_kg.toFixed(1) : "",
    chest_cm: entry ? entry.chest_cm.toFixed(1) : "",
    waist_cm: entry ? entry.waist_cm.toFixed(1) : "",
    arms_cm: entry ? entry.arms_cm.toFixed(1) : "",
    thigh_cm: entry ? entry.thigh_cm.toFixed(1) : "",
    calf_cm: entry ? entry.calf_cm.toFixed(1) : "",
    hips_cm: entry ? entry.hips_cm.toFixed(1) : "",
    navel_cm: entry ? entry.navel_cm.toFixed(1) : "",
  };
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
