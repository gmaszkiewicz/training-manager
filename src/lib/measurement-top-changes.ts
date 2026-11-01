import { measurementFields } from "@/lib/measurement-input";
import type { ChartMeasurement, CircumferenceField, MeasurementField } from "@/types";

export type TopChangeDirection = "up" | "down";

/** A field's largest gain or loss in a window: the list's delta of one entry against its previous entry. */
export interface TopChange {
  field: MeasurementField;
  difference: number;
  measuredOn: string;
  previousMeasuredOn: string | null;
}

/** The 7 circumferences, in `measurementFields` order. */
export const circumferenceFields: readonly CircumferenceField[] = measurementFields.flatMap((definition) =>
  definition.field === "weight_kg" ? [] : [definition.field],
);

function fieldOrder(field: MeasurementField): number {
  return measurementFields.findIndex((definition) => definition.field === field);
}

function wallClock(measuredOn: string): string {
  return measuredOn.replace(" ", "T");
}

/**
 * For each requested field, the entry with the largest `direction` delta. A tie goes to the later `measured_on`.
 * Fields with no such entry are left out. Sorted by difference, largest first, then in `measurementFields` order.
 */
export function topChanges(
  entries: readonly ChartMeasurement[],
  fields: readonly MeasurementField[],
  direction: TopChangeDirection,
): TopChange[] {
  const changes: TopChange[] = [];
  for (const field of fields) {
    let top: TopChange | null = null;
    for (const entry of entries) {
      const delta = entry.deltas?.[field];
      if (delta?.direction !== direction) {
        continue;
      }
      if (
        top === null ||
        delta.difference > top.difference ||
        (delta.difference === top.difference && wallClock(entry.measured_on) >= wallClock(top.measuredOn))
      ) {
        top = {
          field,
          difference: delta.difference,
          measuredOn: entry.measured_on,
          previousMeasuredOn: entry.previous_measured_on,
        };
      }
    }
    if (top !== null && !changes.some((change) => change.field === field)) {
      changes.push(top);
    }
  }
  return changes.sort(
    (left, right) => right.difference - left.difference || fieldOrder(left.field) - fieldOrder(right.field),
  );
}

/** The largest difference across the lists, so a gain and a loss chart share one ring scale; 0 when all are empty. */
export function topChangeScale(...lists: TopChange[][]): number {
  let scale = 0;
  for (const list of lists) {
    for (const change of list) {
      if (change.difference > scale) {
        scale = change.difference;
      }
    }
  }
  return scale;
}
