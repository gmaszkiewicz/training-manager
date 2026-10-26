import { avatarInitials } from "@/lib/profile-form";

export interface TopbarModelInput {
  signedIn: boolean;
  email: string;
  role: "trainee" | "trainer" | null;
  firstName: string | null;
  lastName: string | null;
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
  label: string;
  items: TopbarAccountItem[];
}

export interface TopbarModel {
  greeting: "Hello, guest" | "Hello," | null;
  email: string | null;
  links: TopbarLink[];
  account: TopbarAccount | null;
}

function withCurrent<T extends { href: string }>(items: T[], pathname: string): (T & { current: boolean })[] {
  return items.map((item) => ({ ...item, current: item.href === pathname }));
}

export function topbarModel({ signedIn, email, role, firstName, lastName, pathname }: TopbarModelInput): TopbarModel {
  if (!signedIn) {
    return {
      greeting: "Hello, guest",
      email: null,
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
    email,
    links: withCurrent<Omit<TopbarLink, "current">>(
      [
        { id: "home", label: "Home", href: "/" },
        { id: "measurements", label: "Measurements", href: "/measurements" },
      ],
      pathname,
    ),
    account: {
      initials: avatarInitials({ firstName, lastName, email }),
      label: "Account menu",
      items: withCurrent<Omit<TopbarAccountItem, "current">>(
        [
          { id: "profile", label: "Profile", href: "/profile" },
          { id: "settings", label: "Settings", href: "/settings" },
        ],
        pathname,
      ),
    },
  };
}
