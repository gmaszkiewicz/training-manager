import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { parseProfileRole } from "@/lib/profile-role";
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

// One read of the profile row for /profile: the names to edit and the read-only role.
export async function readProfileDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ names: ProfileNames; role: Profile["role"] | null } | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      names: { firstName: data.first_name, lastName: data.last_name },
      role: parseProfileRole(data.role),
    };
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

    return {
      role: parseProfileRole(data.role),
      names: { firstName: data.first_name, lastName: data.last_name },
      avatarPath: data.avatar_path,
    };
  } catch {
    return null;
  }
}
