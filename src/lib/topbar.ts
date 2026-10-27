import { notificationMessage } from "@/lib/notifications";
import { avatarInitials } from "@/lib/profile-form";
import type { NotificationBellData } from "@/types";

export interface TopbarModelInput {
  signedIn: boolean;
  email: string;
  role: "trainee" | "trainer" | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  pathname: string;
  notifications?: NotificationBellData;
}

export interface TopbarLink {
  id: "home" | "measurements" | "signin" | "signup";
  label: "Home" | "Measurements" | "Sign in" | "Sign up";
  href: string;
  current: boolean;
}

export interface TopbarAccountItem {
  id: "profile" | "hub" | "settings";
  label: "Profile" | "Hub" | "Settings";
  href: string;
  current: boolean;
}

export interface TopbarAccount {
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
  greeting: "Hello, guest" | "Hello," | null;
  name: string | null;
  links: TopbarLink[];
  account: TopbarAccount | null;
}

function withCurrent<T extends { href: string }>(
  items: T[],
  pathname: string,
  matchSubpaths = false,
): (T & { current: boolean })[] {
  return items.map((item) => ({
    ...item,
    current: item.href === pathname || (matchSubpaths && pathname.startsWith(`${item.href}/`)),
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
  role,
  firstName,
  lastName,
  avatarUrl,
  pathname,
  notifications,
}: TopbarModelInput): TopbarModel {
  if (!signedIn) {
    return {
      greeting: "Hello, guest",
      name: null,
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

  const greeting = role === "trainee" || role === "trainer" ? "Hello," : null;

  return {
    greeting,
    name: topbarName({ firstName, lastName, email }),
    links: withCurrent<Omit<TopbarLink, "current">>(
      [
        { id: "home", label: "Home", href: "/" },
        { id: "measurements", label: "Measurements", href: "/measurements" },
      ],
      pathname,
    ),
    account: {
      initials: avatarInitials({ firstName, lastName, email }),
      imageUrl: avatarUrl,
      label: "Account menu",
      items: withCurrent<Omit<TopbarAccountItem, "current">>(
        [
          { id: "profile", label: "Profile", href: "/profile" },
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
