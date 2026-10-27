import type { Database } from "@/db/database.types";

export interface Profile {
  id: string;
  role: "trainee" | "trainer";
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

export interface ProfileDetails {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export type ProfileNames = Pick<ProfileDetails, "firstName" | "lastName">;

/** `linked` is the UI name for an `accepted` trainer link. */
export type CollaborationStatus = "pending" | "linked";

export interface Collaboration {
  otherId: string;
  name: string;
  email: string;
  status: CollaborationStatus;
  linkedAt: string;
}

export interface CollaborationPage {
  rows: Collaboration[];
  page: number;
  pageCount: number;
  pageSize: 5;
}

export type LinkRequestOutcome = "sent" | "pending" | "linked" | "not_found";
