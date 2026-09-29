import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";

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
