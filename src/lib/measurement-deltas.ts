import type { FieldDelta, MeasurementEntry, MeasurementField, MeasurementWithDeltas } from "@/types";

function compareEntries(left: MeasurementEntry, right: MeasurementEntry): number {
  if (left.measured_on < right.measured_on) {
    return -1;
  }
  if (left.measured_on > right.measured_on) {
    return 1;
  }
  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }
  return 0;
}

function deltaBetween(current: number, previous: number): FieldDelta {
  const tenths = Math.round(current * 10) - Math.round(previous * 10);
  if (tenths === 0) {
    return { direction: "none", difference: 0 };
  }
  return {
    direction: tenths > 0 ? "up" : "down",
    difference: Math.abs(tenths) / 10,
  };
}

function deltasAgainst(current: MeasurementEntry, previous: MeasurementEntry): Record<MeasurementField, FieldDelta> {
  return {
    weight_kg: deltaBetween(current.weight_kg, previous.weight_kg),
    chest_cm: deltaBetween(current.chest_cm, previous.chest_cm),
    waist_cm: deltaBetween(current.waist_cm, previous.waist_cm),
    arms_cm: deltaBetween(current.arms_cm, previous.arms_cm),
    thigh_cm: deltaBetween(current.thigh_cm, previous.thigh_cm),
    calf_cm: deltaBetween(current.calf_cm, previous.calf_cm),
    hips_cm: deltaBetween(current.hips_cm, previous.hips_cm),
    navel_cm: deltaBetween(current.navel_cm, previous.navel_cm),
  };
}

export function withDeltas(entries: MeasurementEntry[]): MeasurementWithDeltas[] {
  const chronological = [...entries].sort(compareEntries);
  const compared = chronological.map((entry, index) => {
    if (index === 0) {
      return { ...entry, deltas: null };
    }
    return { ...entry, deltas: deltasAgainst(entry, chronological[index - 1]) };
  });
  return compared.reverse();
}

export function formatDelta(delta: FieldDelta): string {
  switch (delta.direction) {
    case "up":
      return `↑ ${delta.difference.toFixed(1)}`;
    case "down":
      return `↓ ${delta.difference.toFixed(1)}`;
    case "none":
      return "0.0";
  }
}
