import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { ProfileNames } from "@/lib/profile-form";

export async function readProfileNames(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileNames | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return { firstName: data.first_name, lastName: data.last_name };
  } catch {
    return null;
  }
}

export async function updateProfileNames(
  supabase: SupabaseClient<Database>,
  userId: string,
  names: ProfileNames,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ first_name: names.firstName, last_name: names.lastName })
      .eq("id", userId)
      .select("id");

    if (error || data.length !== 1) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
