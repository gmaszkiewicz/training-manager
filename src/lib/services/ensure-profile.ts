import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { Profile } from "@/types";

const UNIQUE_VIOLATION = "23505";

type ProfileRole = Profile["role"];

type FindProfileResult = { status: "found"; profile: Profile } | { status: "missing" } | { status: "error" };

function isProfileRole(role: string): role is ProfileRole {
  return role === "trainee" || role === "trainer";
}

async function findProfile(supabase: SupabaseClient<Database>, userId: string): Promise<FindProfileResult> {
  const { data, error } = await supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();

  if (error || !data) {
    return error ? { status: "error" } : { status: "missing" };
  }

  if (!isProfileRole(data.role)) {
    return { status: "error" };
  }

  return { status: "found", profile: { id: data.id, role: data.role } };
}

export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  requestedRole: ProfileRole | null,
): Promise<{ ok: true; role: ProfileRole } | { ok: false }> {
  try {
    const existing = await findProfile(supabase, userId);

    if (existing.status === "error") {
      return { ok: false };
    }

    if (existing.status === "found") {
      return { ok: true, role: existing.profile.role };
    }

    const role = requestedRole ?? "trainee";
    const { error: insertError } = await supabase.from("profiles").insert({ id: userId, role });

    if (!insertError) {
      return { ok: true, role };
    }

    if (insertError.code !== UNIQUE_VIOLATION) {
      return { ok: false };
    }

    const raced = await findProfile(supabase, userId);
    if (raced.status !== "found") {
      return { ok: false };
    }

    return { ok: true, role: raced.profile.role };
  } catch {
    return { ok: false };
  }
}
