import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { TrainerLink } from "@/lib/trainer-preview";

export async function listTrainerLinks(
  supabase: SupabaseClient<Database>,
): Promise<{ ok: true; links: TrainerLink[] } | { ok: false }> {
  try {
    const { data, error } = await supabase.from("trainer_links").select("trainee_id, email, linked_at");

    if (error) {
      return { ok: false };
    }

    return {
      ok: true,
      links: data.map((row) => ({
        traineeId: row.trainee_id,
        email: row.email,
        linkedAt: row.linked_at,
      })),
    };
  } catch {
    return { ok: false };
  }
}

export async function linkTraineeByEmail(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<{ ok: true; traineeId: string } | { ok: false }> {
  try {
    const { data, error } = await supabase.rpc("link_trainee_by_email", { p_email: email });

    if (error || typeof data !== "string" || data === "") {
      return { ok: false };
    }

    return { ok: true, traineeId: data };
  } catch {
    return { ok: false };
  }
}

export async function searchUnlinkedTrainees(
  supabase: SupabaseClient<Database>,
  query: string,
): Promise<{ ok: true; emails: string[] } | { ok: false }> {
  if (query.trim() === "") {
    return { ok: true, emails: [] };
  }

  try {
    const { data, error } = await supabase.rpc("search_unlinked_trainee_emails", { p_query: query });

    if (error || !Array.isArray(data) || data.some((email) => typeof email !== "string")) {
      return { ok: false };
    }

    return { ok: true, emails: data };
  } catch {
    return { ok: false };
  }
}
