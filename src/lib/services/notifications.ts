import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { pageCountFor } from "@/lib/collaborations";
import type { PageSize } from "@/lib/measurement-page";
import { notificationColumns, parseNotificationKind, toNotification, type NotificationRow } from "@/lib/notifications";
import type { AppNotification, NotificationBellData, NotificationKind, NotificationPage } from "@/types";

const bellSize = 5;

function toNotifications(rows: NotificationRow[]): AppNotification[] {
  return rows.map(toNotification).filter((notification) => notification !== null);
}

export async function readNotificationBell(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true; bell: NotificationBellData } | { ok: false }> {
  try {
    const { data, error, count } = await supabase
      .from("notifications")
      .select(notificationColumns, { count: "exact" })
      .eq("recipient_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(bellSize);

    if (error) {
      return { ok: false };
    }

    return { ok: true, bell: { unreadCount: count ?? data.length, latest: toNotifications(data) } };
  } catch {
    return { ok: false };
  }
}

async function selectNotificationPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  page: number,
  size: PageSize,
): Promise<{ ok: true; rows: NotificationRow[]; total: number | null } | { ok: false }> {
  const from = (page - 1) * size;
  const { data, error, count } = await supabase
    .from("notifications")
    .select(notificationColumns, { count: "exact" })
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + size - 1);

  if (error) {
    // PostgREST answers a range past the end with PGRST103; that is an empty page, not a failure.
    return error.code === "PGRST103" ? { ok: true, rows: [], total: null } : { ok: false };
  }

  return { ok: true, rows: data, total: count ?? null };
}

export async function readNotificationPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  page: number,
  size: PageSize,
): Promise<{ ok: true; page: NotificationPage } | { ok: false }> {
  try {
    const requested = Number.isSafeInteger(page) && page >= 1 ? page : 1;
    let listed = await selectNotificationPage(supabase, userId, requested, size);
    if (!listed.ok) {
      return { ok: false };
    }

    let current = requested;
    if (listed.rows.length === 0 && requested > 1) {
      // Past the end: read page 1 for the total, then the last page.
      const first = await selectNotificationPage(supabase, userId, 1, size);
      if (!first.ok) {
        return { ok: false };
      }
      current = pageCountFor(first.total ?? 0, size);
      listed = current === 1 ? first : await selectNotificationPage(supabase, userId, current, size);
      if (!listed.ok) {
        return { ok: false };
      }
    }

    const total = listed.total ?? 0;
    return {
      ok: true,
      page: {
        rows: toNotifications(listed.rows),
        page: current,
        pageCount: pageCountFor(total, size),
        size,
        total,
      },
    };
  } catch {
    return { ok: false };
  }
}

/** Reads the kind first: RLS hides another user's row, so a missing row is the ownership check. */
export async function openNotification(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<{ ok: true; kind: NotificationKind } | { ok: false }> {
  try {
    const { data, error } = await supabase.from("notifications").select("kind").eq("id", id).maybeSingle();
    if (error || data === null) {
      return { ok: false };
    }

    const kind = parseNotificationKind(data.kind);
    if (kind === null) {
      return { ok: false };
    }

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    if (updateError) {
      return { ok: false };
    }

    return { ok: true, kind };
  } catch {
    return { ok: false };
  }
}

export async function markNotificationsRead(
  supabase: SupabaseClient<Database>,
  ids: readonly string[],
): Promise<{ ok: true } | { ok: false }> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .is("read_at", null);

    return error ? { ok: false } : { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteNotifications(
  supabase: SupabaseClient<Database>,
  ids: readonly string[],
): Promise<{ ok: true } | { ok: false }> {
  try {
    const { error } = await supabase.from("notifications").delete().in("id", ids);

    return error ? { ok: false } : { ok: true };
  } catch {
    return { ok: false };
  }
}
