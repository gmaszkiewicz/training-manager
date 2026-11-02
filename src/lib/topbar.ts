import { notificationMessage } from "@/lib/notifications";
import { avatarInitials } from "@/lib/profile-form";
import type { NotificationBellData } from "@/types";

export interface TopbarModelInput {
  signedIn: boolean;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  pathname: string;
  notifications?: NotificationBellData;
  /** The signed-in user's Measurements module switch; the menu drops its link when off. Defaults to on. */
  measurementsOn?: boolean;
}

export interface TopbarLink {
  id: "home" | "measurements" | "signin" | "signup";
  label: "Home" | "Measurements" | "Sign in" | "Sign up";
  href: string;
  current: boolean;
}

export interface TopbarAccountItem {
  id: "hub" | "settings";
  label: "Hub" | "Settings";
  href: string;
  current: boolean;
}

/** The menu's first entry: the user's name, linking to Profile. */
export interface TopbarProfileEntry {
  name: string;
  href: "/profile";
  current: boolean;
}

export interface TopbarAccount {
  profile: TopbarProfileEntry;
  initials: string;
  imageUrl: string | null;
  label: string;
  items: TopbarAccountItem[];
  notifications: TopbarNotifications;
}

export interface TopbarNotificationItem {
  id: string;
  message: string;
  createdAt: string;
}

export interface TopbarNotifications {
  unreadCount: number;
  items: TopbarNotificationItem[];
  allHref: "/hub/notifications";
}

export interface TopbarModel {
  links: TopbarLink[];
  account: TopbarAccount | null;
}

function isCurrent(href: string, pathname: string, matchSubpaths: boolean): boolean {
  return href === pathname || (matchSubpaths && pathname.startsWith(`${href}/`));
}

function withCurrent<T extends { href: string }>(
  items: T[],
  pathname: string,
  matchSubpaths = false,
): (T & { current: boolean })[] {
  return items.map((item) => ({
    ...item,
    current: isCurrent(item.href, pathname, matchSubpaths),
  }));
}

/** "A. Lovelace" with both names, the one saved name alone, otherwise the email. */
export function topbarName({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const first = firstName?.trim() ?? "";
  const last = lastName?.trim() ?? "";
  if (first !== "" && last !== "") {
    return `${first.charAt(0).toUpperCase()}. ${last}`;
  }
  return last || first || email;
}

const topbarBellSize = 5;

/** The bell is always there for a signed-in user; the count stays the total, the items the latest few unread. */
function topbarNotifications(bell: NotificationBellData | undefined): TopbarNotifications {
  return {
    unreadCount: bell?.unreadCount ?? 0,
    items: (bell?.latest ?? []).slice(0, topbarBellSize).map((notification) => ({
      id: notification.id,
      message: notificationMessage(notification),
      createdAt: notification.createdAt,
    })),
    allHref: "/hub/notifications",
  };
}

export function topbarModel({
  signedIn,
  email,
  firstName,
  lastName,
  avatarUrl,
  pathname,
  notifications,
  measurementsOn = true,
}: TopbarModelInput): TopbarModel {
  if (!signedIn) {
    return {
      account: null,
      links: withCurrent<Omit<TopbarLink, "current">>(
        [
          { id: "home", label: "Home", href: "/" },
          { id: "signin", label: "Sign in", href: "/auth/signin" },
          { id: "signup", label: "Sign up", href: "/auth/signup" },
        ],
        pathname,
      ),
    };
  }

  return {
    links: withCurrent<Omit<TopbarLink, "current">>(
      [
        { id: "home", label: "Home", href: "/" },
        ...(measurementsOn
          ? [{ id: "measurements" as const, label: "Measurements" as const, href: "/measurements" }]
          : []),
      ],
      pathname,
    ),
    account: {
      profile: {
        name: topbarName({ firstName, lastName, email }),
        href: "/profile",
        current: isCurrent("/profile", pathname, true),
      },
      initials: avatarInitials({ firstName, lastName, email }),
      imageUrl: avatarUrl,
      label: "Account menu",
      items: withCurrent<Omit<TopbarAccountItem, "current">>(
        [
          { id: "hub", label: "Hub", href: "/hub" },
          { id: "settings", label: "Settings", href: "/settings" },
        ],
        pathname,
        true,
      ),
      notifications: topbarNotifications(notifications),
    },
  };
}
