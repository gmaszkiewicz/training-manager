import { describe, expect, it } from "vitest";

import {
  notificationErrorMessage,
  notificationHref,
  notificationKinds,
  notificationMaxPage,
  notificationMessage,
  notificationNoticeMessage,
  notificationsPath,
  parseNotificationPage,
  parseNotificationPageSize,
  toNotification,
  type NotificationRow,
} from "@/lib/notifications";
import type { AppNotification } from "@/types";

const row: NotificationRow = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  kind: "link_requested",
  actor_role: "trainer",
  actor_first_name: "Ada",
  actor_last_name: "Lovelace",
  actor_email: "ada@example.com",
  created_at: "2026-10-27T10:00:00.000Z",
  read_at: null,
};

const notification: AppNotification = {
  id: row.id,
  kind: "link_requested",
  actorRole: "trainer",
  actorFirstName: "Ada",
  actorLastName: "Lovelace",
  actorEmail: "ada@example.com",
  createdAt: row.created_at,
  readAt: null,
};

describe("notificationMessage", () => {
  it("words each kind with the actor's name", () => {
    expect(notificationMessage(notification)).toBe("Trainer A. Lovelace requested read access to your measurements");
    expect(notificationMessage({ ...notification, kind: "link_accepted", actorRole: "trainee" })).toBe(
      "Trainee A. Lovelace gave you read access to their measurements",
    );
    expect(notificationMessage({ ...notification, kind: "link_declined", actorRole: "trainee" })).toBe(
      "Trainee A. Lovelace declined your request for read access to their measurements",
    );
    expect(notificationMessage({ ...notification, kind: "link_cancelled" })).toBe(
      "Trainer A. Lovelace withdrew their request for read access to your measurements",
    );
  });

  it("names the revoker's role for revoked access", () => {
    expect(notificationMessage({ ...notification, kind: "link_removed", actorRole: "trainer" })).toBe(
      "Trainer A. Lovelace revoked their read access to your measurements",
    );
    expect(notificationMessage({ ...notification, kind: "link_removed", actorRole: "trainee" })).toBe(
      "Trainee A. Lovelace revoked your read access to their measurements",
    );
  });

  it("falls back to the one saved name, then the email", () => {
    expect(notificationMessage({ ...notification, actorFirstName: null })).toBe(
      "Trainer Lovelace requested read access to your measurements",
    );
    expect(notificationMessage({ ...notification, actorLastName: " " })).toBe(
      "Trainer Ada requested read access to your measurements",
    );
    expect(notificationMessage({ ...notification, actorFirstName: null, actorLastName: null })).toBe(
      "Trainer ada@example.com requested read access to your measurements",
    );
  });
});

describe("notificationHref", () => {
  it("opens collaborations for every kind", () => {
    for (const kind of notificationKinds) {
      expect(notificationHref(kind)).toBe("/hub/collaborations");
    }
  });
});

describe("parseNotificationPage", () => {
  it("keeps a page within range", () => {
    expect(parseNotificationPage("1")).toBe(1);
    expect(parseNotificationPage(" 3 ")).toBe(3);
    expect(parseNotificationPage(String(notificationMaxPage))).toBe(notificationMaxPage);
  });

  it("falls back to 1 otherwise", () => {
    expect(parseNotificationPage("0")).toBe(1);
    expect(parseNotificationPage("-2")).toBe(1);
    expect(parseNotificationPage("1.5")).toBe(1);
    expect(parseNotificationPage("abc")).toBe(1);
    expect(parseNotificationPage("")).toBe(1);
    expect(parseNotificationPage(null)).toBe(1);
    expect(parseNotificationPage(undefined)).toBe(1);
    expect(parseNotificationPage(String(notificationMaxPage + 1))).toBe(1);
  });
});

describe("parseNotificationPageSize", () => {
  it("keeps 5, 10 and 15", () => {
    expect(parseNotificationPageSize("5")).toBe(5);
    expect(parseNotificationPageSize("10")).toBe(10);
    expect(parseNotificationPageSize("15")).toBe(15);
  });

  it("falls back to 5 otherwise", () => {
    expect(parseNotificationPageSize("20")).toBe(5);
    expect(parseNotificationPageSize("abc")).toBe(5);
    expect(parseNotificationPageSize("")).toBe(5);
    expect(parseNotificationPageSize(null)).toBe(5);
  });
});

describe("notice and error messages", () => {
  it("maps the known codes", () => {
    expect(notificationNoticeMessage("read")).toBe("Notifications marked as read");
    expect(notificationNoticeMessage("deleted")).toBe("Notifications deleted");
    expect(notificationErrorMessage("failed")).toBe("Could not update notifications");
  });

  it("ignores unknown codes", () => {
    expect(notificationNoticeMessage("removed")).toBeNull();
    expect(notificationNoticeMessage(null)).toBeNull();
    expect(notificationErrorMessage("other")).toBeNull();
    expect(notificationErrorMessage(null)).toBeNull();
  });
});

describe("notificationsPath", () => {
  it("builds the Hub notifications URL", () => {
    expect(notificationsPath({ page: 2, size: 10 })).toBe("/hub/notifications?page=2&size=10");
    expect(notificationsPath({ page: 1, size: 5, notice: "read" })).toBe(
      "/hub/notifications?page=1&size=5&notice=read",
    );
    expect(notificationsPath({ page: 1, size: 15, error: "failed" })).toBe(
      "/hub/notifications?page=1&size=15&error=failed",
    );
  });
});

describe("toNotification", () => {
  it("maps a stored row", () => {
    expect(toNotification(row)).toEqual(notification);
  });

  it("drops a row with an unknown kind or role", () => {
    expect(toNotification({ ...row, kind: "other" })).toBeNull();
    expect(toNotification({ ...row, actor_role: "admin" })).toBeNull();
  });
});
