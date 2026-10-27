import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { collaborationPageSize, pageCountFor, toCollaboration, type CollaborationRow } from "@/lib/collaborations";
import type { TrainerLink } from "@/lib/trainer-preview";
import type { CollaborationPage, LinkRequestOutcome, Profile } from "@/types";

const LINK_REQUEST_OUTCOMES: readonly LinkRequestOutcome[] = ["sent", "pending", "linked", "not_found"];

export async function listTrainerLinks(
  supabase: SupabaseClient<Database>,
): Promise<{ ok: true; links: TrainerLink[] } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("trainer_links")
      .select("trainee_id, email, linked_at")
      .eq("status", "accepted");

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

export async function requestTraineeLink(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<{ ok: true; outcome: LinkRequestOutcome } | { ok: false }> {
  try {
    const { data, error } = await supabase.rpc("request_trainee_link", { p_email: email });

    const outcome = LINK_REQUEST_OUTCOMES.find((value) => value === data);
    if (error || outcome === undefined) {
      return { ok: false };
    }

    return { ok: true, outcome };
  } catch {
    return { ok: false };
  }
}

async function listCollaborationRows(
  supabase: SupabaseClient<Database>,
  role: Profile["role"],
  page: number,
): Promise<{ ok: true; rows: CollaborationRow[]; total: number } | { ok: false }> {
  const args = { p_page: page, p_size: collaborationPageSize };

  if (role === "trainer") {
    const { data, error } = await supabase.rpc("list_trainer_collaborations", args);
    if (error || !Array.isArray(data)) {
      return { ok: false };
    }
    return {
      ok: true,
      total: data.length > 0 ? data[0].total : 0,
      rows: data.map((row) => ({
        otherId: row.trainee_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        status: row.status,
        linkedAt: row.linked_at,
      })),
    };
  }

  const { data, error } = await supabase.rpc("list_trainee_collaborations", args);
  if (error || !Array.isArray(data)) {
    return { ok: false };
  }
  return {
    ok: true,
    total: data.length > 0 ? data[0].total : 0,
    rows: data.map((row) => ({
      otherId: row.trainer_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      status: row.status,
      linkedAt: row.linked_at,
    })),
  };
}

export async function readCollaborationPage(
  supabase: SupabaseClient<Database>,
  role: Profile["role"],
  page: number,
): Promise<{ ok: true; page: CollaborationPage } | { ok: false }> {
  try {
    const requested = Number.isSafeInteger(page) && page >= 1 ? page : 1;
    let listed = await listCollaborationRows(supabase, role, requested);
    if (!listed.ok) {
      return { ok: false };
    }

    let current = requested;
    if (listed.rows.length === 0 && requested > 1) {
      // Past the end: read page 1 for the total, then the last page.
      const first = await listCollaborationRows(supabase, role, 1);
      if (!first.ok) {
        return { ok: false };
      }
      current = pageCountFor(first.total, collaborationPageSize);
      listed = current === 1 ? first : await listCollaborationRows(supabase, role, current);
      if (!listed.ok) {
        return { ok: false };
      }
    }

    return {
      ok: true,
      page: {
        rows: listed.rows.map(toCollaboration),
        page: current,
        pageCount: pageCountFor(listed.total, collaborationPageSize),
        pageSize: collaborationPageSize,
      },
    };
  } catch {
    return { ok: false };
  }
}

export async function acceptTrainerLink(
  supabase: SupabaseClient<Database>,
  trainerId: string,
): Promise<{ ok: true; accepted: boolean } | { ok: false }> {
  try {
    const { data, error } = await supabase.rpc("accept_trainer_link", { p_trainer_id: trainerId });

    if (error || typeof data !== "boolean") {
      return { ok: false };
    }

    return { ok: true, accepted: data };
  } catch {
    return { ok: false };
  }
}

export async function removeTrainerLink(
  supabase: SupabaseClient<Database>,
  otherId: string,
): Promise<{ ok: true; removed: boolean } | { ok: false }> {
  try {
    const { data, error } = await supabase.rpc("remove_trainer_link", { p_other_id: otherId });

    if (error || typeof data !== "boolean") {
      return { ok: false };
    }

    return { ok: true, removed: data };
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
