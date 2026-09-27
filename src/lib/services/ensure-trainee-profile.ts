import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types";

const UNIQUE_VIOLATION = "23505";

interface ProfileRow extends Record<string, unknown> {
  id: string;
  role: string;
  created_at: string;
}

interface ProfileInsert extends Record<string, unknown> {
  id: string;
  role: Profile["role"];
  created_at?: string;
}

interface ProfilesDatabase {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

type ProfilesClient = SupabaseClient<ProfilesDatabase>;

type FindProfileResult = { status: "found"; profile: Profile } | { status: "missing" } | { status: "error" };

function profilesClient(supabase: SupabaseClient): ProfilesClient {
  return supabase as ProfilesClient;
}

async function findProfile(supabase: ProfilesClient, userId: string): Promise<FindProfileResult> {
  const { data, error } = await supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();

  if (error || !data) {
    return error ? { status: "error" } : { status: "missing" };
  }

  if (data.role !== "trainee") {
    return { status: "error" };
  }

  return { status: "found", profile: { id: data.id, role: "trainee" } };
}

export async function ensureTraineeProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; role: "trainee" } | { ok: false }> {
  try {
    const client = profilesClient(supabase);
    const existing = await findProfile(client, userId);

    if (existing.status === "error") {
      return { ok: false };
    }

    if (existing.status === "found") {
      return { ok: true, role: existing.profile.role };
    }

    const { error: insertError } = await client.from("profiles").insert({ id: userId, role: "trainee" });

    if (!insertError) {
      return { ok: true, role: "trainee" };
    }

    if (insertError.code !== UNIQUE_VIOLATION) {
      return { ok: false };
    }

    const raced = await findProfile(client, userId);
    if (raced.status !== "found") {
      return { ok: false };
    }

    return { ok: true, role: raced.profile.role };
  } catch {
    return { ok: false };
  }
}
