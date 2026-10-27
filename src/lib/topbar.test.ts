import { describe, expect, it } from "vitest";

import { topbarModel, topbarName, type TopbarModelInput } from "@/lib/topbar";
import type { AppNotification } from "@/types";

const signedIn: Omit<TopbarModelInput, "pathname"> = {
  signedIn: true,
  email: "ada@example.com",
  role: "trainee",
  firstName: null,
  lastName: null,
  avatarUrl: null,
};

const guest: Omit<TopbarModelInput, "pathname"> = {
  signedIn: false,
  email: "",
  role: null,
  firstName: null,
  lastName: null,
  avatarUrl: null,
};

const signedInLinks = (current: "home" | "measurements" | null) => [
  { id: "home", label: "Home", href: "/", current: current === "home" },
  { id: "measurements", label: "Measurements", href: "/measurements", current: current === "measurements" },
];

const accountItems = (current: "profile" | "hub" | "settings" | null) => [
  { id: "profile", label: "Profile", href: "/profile", current: current === "profile" },
  { id: "hub", label: "Hub", href: "/hub", current: current === "hub" },
  { id: "settings", label: "Settings", href: "/settings", current: current === "settings" },
];

describe("topbarModel", () => {
  it("returns the guest bar with no account and marks Home on /", () => {
    expect(topbarModel({ ...guest, email: "ada@example.com", role: "trainee", pathname: "/" })).toEqual({
      greeting: "Hello, guest",
      name: null,
      account: null,
      links: [
        { id: "home", label: "Home", href: "/", current: true },
        { id: "signin", label: "Sign in", href: "/auth/signin", current: false },
        { id: "signup", label: "Sign up", href: "/auth/signup", current: false },
      ],
    });
  });

  it("marks Sign in for a guest on /auth/signin", () => {
    const result = topbarModel({ ...guest, pathname: "/auth/signin" });

    expect(result.account).toBeNull();
    expect(result.links).toEqual([
      { id: "home", label: "Home", href: "/", current: false },
      { id: "signin", label: "Sign in", href: "/auth/signin", current: true },
      { id: "signup", label: "Sign up", href: "/auth/signup", current: false },
    ]);
  });

  it("marks Sign up for a guest on /auth/signup", () => {
    const result = topbarModel({ ...guest, pathname: "/auth/signup" });

    expect(result.links).toEqual([
      { id: "home", label: "Home", href: "/", current: false },
      { id: "signin", label: "Sign in", href: "/auth/signin", current: false },
      { id: "signup", label: "Sign up", href: "/auth/signup", current: true },
    ]);
  });

  it("returns Hello with email, Home and Measurements links, and the account menu on /", () => {
    expect(topbarModel({ ...signedIn, pathname: "/" })).toEqual({
      greeting: "Hello,",
      name: "ada@example.com",
      links: signedInLinks("home"),
      account: {
        initials: "A",
        imageUrl: null,
        label: "Account menu",
        items: accountItems(null),
        notifications: { unreadCount: 0, items: [], allHref: "/hub/notifications" },
      },
    });
  });

  it("returns Hello with email for a trainer", () => {
    const result = topbarModel({ ...signedIn, role: "trainer", pathname: "/" });

    expect(result.greeting).toBe("Hello,");
    expect(result.name).toBe("ada@example.com");
    expect(result.links).toEqual(signedInLinks("home"));
    expect(result.account?.items).toEqual(accountItems(null));
  });

  it("marks Measurements on /measurements with href /measurements and no query", () => {
    const result = topbarModel({ ...signedIn, pathname: "/measurements" });

    expect(result.links).toEqual(signedInLinks("measurements"));
    expect(result.account?.items).toEqual(accountItems(null));
  });

  it("marks Profile in the account menu on /profile", () => {
    const result = topbarModel({ ...signedIn, pathname: "/profile" });

    expect(result.links).toEqual(signedInLinks(null));
    expect(result.account?.items).toEqual(accountItems("profile"));
  });

  it("marks Profile and not Settings in the account menu on /profile/avatar", () => {
    const result = topbarModel({ ...signedIn, pathname: "/profile/avatar" });

    expect(result.links).toEqual(signedInLinks(null));
    expect(result.account?.items).toEqual(accountItems("profile"));
  });

  it("does not mark Profile on a path that only shares its prefix", () => {
    const result = topbarModel({ ...signedIn, pathname: "/profiles" });

    expect(result.account?.items).toEqual(accountItems(null));
  });

  it("marks Hub in the account menu on /hub", () => {
    const result = topbarModel({ ...signedIn, pathname: "/hub" });

    expect(result.links).toEqual(signedInLinks(null));
    expect(result.account?.items).toEqual(accountItems("hub"));
  });

  it("marks Hub in the account menu on /hub/collaborations", () => {
    const result = topbarModel({ ...signedIn, pathname: "/hub/collaborations" });

    expect(result.links).toEqual(signedInLinks(null));
    expect(result.account?.items).toEqual(accountItems("hub"));
  });

  it("does not mark Hub on a path that only shares its prefix", () => {
    const result = topbarModel({ ...signedIn, pathname: "/hubs" });

    expect(result.account?.items).toEqual(accountItems(null));
  });

  it("marks Settings in the account menu on /settings", () => {
    const result = topbarModel({ ...signedIn, pathname: "/settings" });

    expect(result.links).toEqual(signedInLinks(null));
    expect(result.account?.items).toEqual(accountItems("settings"));
  });

  it("marks nothing for a signed-in user on /auth/signin", () => {
    const result = topbarModel({ ...signedIn, pathname: "/auth/signin" });

    expect(result.links.every((link) => !link.current)).toBe(true);
    expect(result.account?.items.every((item) => !item.current)).toBe(true);
  });

  it("uses two initials when both names are saved", () => {
    const result = topbarModel({ ...signedIn, firstName: "grace", lastName: "Hopper", pathname: "/" });

    expect(result.account?.initials).toBe("GH");
  });

  it("uses one initial when only one name is saved", () => {
    expect(topbarModel({ ...signedIn, firstName: "Grace", pathname: "/" }).account?.initials).toBe("G");
    expect(topbarModel({ ...signedIn, lastName: "Hopper", pathname: "/" }).account?.initials).toBe("H");
  });

  it("falls back to the email's first letter when no name is saved", () => {
    expect(topbarModel({ ...signedIn, email: "zoe@example.com", pathname: "/" }).account?.initials).toBe("Z");
  });

  it("passes the avatar URL through as the account image", () => {
    const url = "https://example.supabase.co/storage/v1/object/public/avatars/u/avatar.png";

    expect(topbarModel({ ...signedIn, avatarUrl: url, pathname: "/" }).account?.imageUrl).toBe(url);
  });

  it("keeps the account image null when there is no avatar", () => {
    expect(topbarModel({ ...signedIn, pathname: "/" }).account?.imageUrl).toBeNull();
  });

  it("returns email-only with greeting null when role is null", () => {
    expect(topbarModel({ ...signedIn, role: null, pathname: "/" })).toEqual({
      greeting: null,
      name: "ada@example.com",
      links: signedInLinks("home"),
      account: {
        initials: "A",
        imageUrl: null,
        label: "Account menu",
        items: accountItems(null),
        notifications: { unreadCount: 0, items: [], allHref: "/hub/notifications" },
      },
    });
  });
});

const emptyBell = { unreadCount: 0, items: [], allHref: "/hub/notifications" };

const unread = (index: number): AppNotification => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  kind: "link_requested",
  actorRole: "trainer",
  actorFirstName: "Grace",
  actorLastName: "Hopper",
  actorEmail: "grace@example.com",
  createdAt: `2026-10-2${index}T10:00:00.000Z`,
  readAt: null,
});

describe("topbarModel notifications", () => {
  it("keeps an empty bell with the see-all link when no notifications are passed", () => {
    expect(topbarModel({ ...signedIn, pathname: "/" }).account?.notifications).toEqual(emptyBell);
  });

  it("keeps an empty bell with the see-all link at zero unread", () => {
    const result = topbarModel({ ...signedIn, pathname: "/", notifications: { unreadCount: 0, latest: [] } });

    expect(result.account?.notifications).toEqual(emptyBell);
  });

  it("carries one unread with its message, date and the see-all link", () => {
    const result = topbarModel({ ...signedIn, pathname: "/", notifications: { unreadCount: 1, latest: [unread(1)] } });

    expect(result.account?.notifications).toEqual({
      unreadCount: 1,
      items: [
        {
          id: unread(1).id,
          message: "Trainer G. Hopper sent you a link request",
          createdAt: "2026-10-21T10:00:00.000Z",
        },
      ],
      allHref: "/hub/notifications",
    });
  });

  it("keeps the total count and five items when more than five are unread", () => {
    const latest = [1, 2, 3, 4, 5, 6].map(unread);
    const result = topbarModel({ ...signedIn, pathname: "/", notifications: { unreadCount: 120, latest } });

    expect(result.account?.notifications.unreadCount).toBe(120);
    expect(result.account?.notifications.items.map((item) => item.id)).toEqual(
      latest.slice(0, 5).map((notification) => notification.id),
    );
  });

  it("has no account and so no bell for a guest", () => {
    const result = topbarModel({ ...guest, pathname: "/", notifications: { unreadCount: 3, latest: [unread(1)] } });

    expect(result.account).toBeNull();
  });
});

describe("topbarName", () => {
  const email = "ada@example.com";

  it("returns the first initial and the last name when both are saved", () => {
    expect(topbarName({ firstName: "ada", lastName: "Lovelace", email })).toBe("A. Lovelace");
  });

  it("returns the last name alone when only it is saved", () => {
    expect(topbarName({ firstName: null, lastName: "Lovelace", email })).toBe("Lovelace");
  });

  it("returns the first name alone when only it is saved", () => {
    expect(topbarName({ firstName: "Ada", lastName: "  ", email })).toBe("Ada");
  });

  it("returns the email when no name is saved", () => {
    expect(topbarName({ firstName: " ", lastName: null, email })).toBe(email);
  });
});

describe("topbarModel name", () => {
  it("greets a signed-in user by the saved names", () => {
    const result = topbarModel({ ...signedIn, firstName: "Ada", lastName: "Lovelace", pathname: "/" });

    expect(result.greeting).toBe("Hello,");
    expect(result.name).toBe("A. Lovelace");
  });
});
