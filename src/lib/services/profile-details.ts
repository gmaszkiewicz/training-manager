import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { resolveComponentSettings, storedComponentSettings } from "@/lib/components";
import { parseProfileRole } from "@/lib/profile-role";
import type { ComponentSettings, Profile, ProfileNames } from "@/types";

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
  components: ComponentSettings;
}

// One read of the profile row for the top bar: role for the greeting, names for the avatar initials, the avatar image path,
// and the resolved component choices.
export async function readTopbarProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TopbarProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, first_name, last_name, avatar_path, component_settings")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      role: parseProfileRole(data.role),
      names: { firstName: data.first_name, lastName: data.last_name },
      avatarPath: data.avatar_path,
      components: resolveComponentSettings(data.component_settings),
    };
  } catch {
    return null;
  }
}

// The resolved component choices for the Settings page; `null` when the row cannot be read, so the page never offers
// the defaults for saving over the stored choices.
export async function readComponentSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ComponentSettings | null> {
  try {
    const { data, error } = await supabase.from("profiles").select("component_settings").eq("id", userId).maybeSingle();

    if (error || !data) {
      return null;
    }

    return resolveComponentSettings(data.component_settings);
  } catch {
    return null;
  }
}

// One read of the profile row for Settings → Components: the resolved choices and the role whose rows the form lists;
// `null` when the row cannot be read or has no known role.
export async function readComponentSettingsDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ settings: ComponentSettings; role: Profile["role"] } | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, component_settings")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const role = parseProfileRole(data.role);
    return role ? { settings: resolveComponentSettings(data.component_settings), role } : null;
  } catch {
    return null;
  }
}

export async function updateComponentSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
  settings: ComponentSettings,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ component_settings: storedComponentSettings(settings) })
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
