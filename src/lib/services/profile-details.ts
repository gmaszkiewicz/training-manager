import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { Profile, ProfileNames } from "@/types";

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

export interface TopbarProfile {
  role: Profile["role"] | null;
  names: ProfileNames;
  avatarPath: string | null;
}

// One read of the profile row for the top bar: role for the greeting, names for the avatar initials, the avatar image path.
export async function readTopbarProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TopbarProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, first_name, last_name, avatar_path")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const role = data.role === "trainee" || data.role === "trainer" ? data.role : null;
    return {
      role,
      names: { firstName: data.first_name, lastName: data.last_name },
      avatarPath: data.avatar_path,
    };
  } catch {
    return null;
  }
}
