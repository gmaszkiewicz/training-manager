import { avatarInitials } from "@/lib/profile-form";

export interface TopbarModelInput {
  signedIn: boolean;
  email: string;
  role: "trainee" | "trainer" | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  pathname: string;
}

export interface TopbarLink {
  id: "home" | "measurements" | "signin" | "signup";
  label: "Home" | "Measurements" | "Sign in" | "Sign up";
  href: string;
  current: boolean;
}

export interface TopbarAccountItem {
  id: "profile" | "settings";
  label: "Profile" | "Settings";
  href: string;
  current: boolean;
}

export interface TopbarAccount {
  initials: string;
  imageUrl: string | null;
  label: string;
  items: TopbarAccountItem[];
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

export function topbarModel({
  signedIn,
  email,
  role,
  firstName,
  lastName,
  avatarUrl,
  pathname,
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
          { id: "settings", label: "Settings", href: "/settings" },
        ],
        pathname,
        true,
      ),
    },
  };
}
