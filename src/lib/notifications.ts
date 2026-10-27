import type { Database } from "@/db/database.types";
import { defaultPageSize, pageSizes, type PageSize } from "@/lib/measurement-page";
import { topbarName } from "@/lib/topbar";
import type { AppNotification, NotificationKind, Profile } from "@/types";

// Keeps (page - 1) * size well inside what the range query can address.
export const notificationMaxPage = 10_000;

export const notificationKinds: readonly NotificationKind[] = [
  "link_requested",
  "link_accepted",
  "link_declined",
  "link_cancelled",
  "link_removed",
];

const ACTOR_ROLES: readonly Profile["role"][] = ["trainer", "trainee"];

export type NotificationRow = Pick<
  Database["public"]["Tables"]["notifications"]["Row"],
  "id" | "kind" | "actor_role" | "actor_first_name" | "actor_last_name" | "actor_email" | "created_at" | "read_at"
>;

export const notificationColumns =
  "id, kind, actor_role, actor_first_name, actor_last_name, actor_email, created_at, read_at";

export function parseNotificationKind(value: string): NotificationKind | null {
  return notificationKinds.find((kind) => kind === value) ?? null;
}

/** Maps a stored row; a kind or role outside the known set yields null so it is never shown with made-up copy. */
export function toNotification(row: NotificationRow): AppNotification | null {
  const kind = parseNotificationKind(row.kind);
  const actorRole = ACTOR_ROLES.find((role) => role === row.actor_role);
  if (kind === null || actorRole === undefined) {
    return null;
  }
  return {
    id: row.id,
    kind,
    actorRole,
    actorFirstName: row.actor_first_name,
    actorLastName: row.actor_last_name,
    actorEmail: row.actor_email,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export function notificationMessage(
  notification: Pick<AppNotification, "kind" | "actorRole" | "actorFirstName" | "actorLastName" | "actorEmail">,
): string {
  const name = topbarName({
    firstName: notification.actorFirstName,
    lastName: notification.actorLastName,
    email: notification.actorEmail,
  });
  switch (notification.kind) {
    case "link_requested":
      return `Trainer ${name} sent you a link request`;
    case "link_accepted":
      return `Trainee ${name} accepted your link request`;
    case "link_declined":
      return `Trainee ${name} declined your link request`;
    case "link_cancelled":
      return `Trainer ${name} withdrew their link request`;
    case "link_removed":
      return `${notification.actorRole === "trainer" ? "Trainer" : "Trainee"} ${name} removed the link`;
  }
}

// Every kind is about a trainer link, so every notification opens the collaborations tab.
export function notificationHref(kind: NotificationKind): string {
  switch (kind) {
    case "link_requested":
    case "link_accepted":
    case "link_declined":
    case "link_cancelled":
    case "link_removed":
      return "/hub/collaborations";
  }
}

export function parseNotificationPage(raw: string | null | undefined): number {
  if (raw == null || !/^\d+$/.test(raw.trim())) {
    return 1;
  }
  const page = Number(raw.trim());
  return Number.isSafeInteger(page) && page >= 1 && page <= notificationMaxPage ? page : 1;
}

export function parseNotificationPageSize(raw: string | null | undefined): PageSize {
  const value = raw?.trim();
  return pageSizes.find((size) => String(size) === value) ?? defaultPageSize;
}

export type NotificationNotice = "read" | "deleted";

export function notificationNoticeMessage(code: string | null): string | null {
  if (code === "read") {
    return "Notifications marked as read";
  }
  if (code === "deleted") {
    return "Notifications deleted";
  }
  return null;
}

export function notificationErrorMessage(code: string | null): string | null {
  if (code === "failed") {
    return "Could not update notifications";
  }
  return null;
}

export function notificationsPath({
  page,
  size,
  notice,
  error,
}: {
  page: number;
  size: PageSize;
  notice?: NotificationNotice;
  error?: "failed";
}): string {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (notice !== undefined) {
    params.set("notice", notice);
  }
  if (error !== undefined) {
    params.set("error", error);
  }
  return `/hub/notifications?${params.toString()}`;
}
