import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { withDeltas } from "@/lib/measurement-deltas";
import type { MeasurementWithDeltas } from "@/types";

interface MeasurementInput {
  measured_on: string;
  weight_kg: number;
  chest_cm: number;
  waist_cm: number;
  arms_cm: number;
  thigh_cm: number;
  calf_cm: number;
  hips_cm: number;
  navel_cm: number;
  note: string | null;
}

const measurementColumns =
  "id, measured_on, created_at, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm, note";

export async function listMeasurements(
  supabase: SupabaseClient<Database>,
  traineeId: string,
): Promise<{ ok: true; entries: MeasurementWithDeltas[] } | { ok: false }> {
  try {
    const { data, error } = await supabase.from("measurements").select(measurementColumns).eq("trainee_id", traineeId);

    if (error) {
      return { ok: false };
    }

    return { ok: true, entries: withDeltas(data) };
  } catch {
    return { ok: false };
  }
}

export async function addMeasurement(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  input: MeasurementInput,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const { error } = await supabase.from("measurements").insert({
      trainee_id: traineeId,
      measured_on: input.measured_on,
      weight_kg: input.weight_kg,
      chest_cm: input.chest_cm,
      waist_cm: input.waist_cm,
      arms_cm: input.arms_cm,
      thigh_cm: input.thigh_cm,
      calf_cm: input.calf_cm,
      hips_cm: input.hips_cm,
      navel_cm: input.navel_cm,
      note: input.note,
    });

    if (error) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function updateMeasurement(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  measurementId: string,
  input: MeasurementInput,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("measurements")
      .update({
        measured_on: input.measured_on,
        weight_kg: input.weight_kg,
        chest_cm: input.chest_cm,
        waist_cm: input.waist_cm,
        arms_cm: input.arms_cm,
        thigh_cm: input.thigh_cm,
        calf_cm: input.calf_cm,
        hips_cm: input.hips_cm,
        navel_cm: input.navel_cm,
        note: input.note,
      })
      .eq("id", measurementId)
      .eq("trainee_id", traineeId)
      .select("id");

    if (error || data.length === 0) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
