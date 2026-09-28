import type { Database } from "@/db/database.types";

export interface Profile {
  id: string;
  role: "trainee";
}

export type MeasurementField =
  "weight_kg" | "chest_cm" | "waist_cm" | "arms_cm" | "thigh_cm" | "calf_cm" | "hips_cm" | "navel_cm";

export type MeasurementEntry = Omit<Database["public"]["Tables"]["measurements"]["Row"], "trainee_id">;

export interface FieldDelta {
  direction: "up" | "down" | "none";
  difference: number;
}

export type MeasurementWithDeltas = MeasurementEntry & {
  deltas: Record<MeasurementField, FieldDelta> | null;
};
