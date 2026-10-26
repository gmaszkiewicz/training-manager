const MEASURED_ON = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/;

export type MeasurementNoticeKind = "added" | "updated" | "deleted";

export function measurementNoticeMinute(value: string | null): string | null {
  if (value === null || !MEASURED_ON.test(value)) {
    return null;
  }
  return value;
}

export function measurementNoticeMessage(kind: string | null, measuredOn: string | null): string | null {
  const minute = measurementNoticeMinute(measuredOn);
  if ((kind !== "added" && kind !== "updated" && kind !== "deleted") || minute === null) {
    return null;
  }
  const when = minute.replace("T", " ");
  if (kind === "added") {
    return `Measurement from ${when} was added.`;
  }
  if (kind === "updated") {
    return `Measurement from ${when} was updated.`;
  }
  return `Measurement from ${when} was deleted.`;
}
