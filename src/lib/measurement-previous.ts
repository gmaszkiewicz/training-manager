import type { MeasurementEntry } from "@/types";

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
