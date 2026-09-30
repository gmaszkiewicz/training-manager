export interface TopbarModelInput {
  signedIn: boolean;
  email: string;
  role: "trainee" | "trainer" | null;
  pathname: string;
}

export interface TopbarLink {
  id: "home" | "measurements" | "signin" | "signup";
  label: "Home" | "Measurements" | "Sign in" | "Sign up";
  href: string;
  current: boolean;
}

export interface TopbarModel {
  greeting: "Hello guest" | "Hello trainee" | "Hello trainer" | null;
  email: string | null;
  links: TopbarLink[];
  showSignOut: boolean;
}

function withCurrent(links: Omit<TopbarLink, "current">[], pathname: string): TopbarLink[] {
  return links.map((link) => ({ ...link, current: link.href === pathname }));
}

export function topbarModel({ signedIn, email, role, pathname }: TopbarModelInput): TopbarModel {
  if (!signedIn) {
    return {
      greeting: "Hello guest",
      email: null,
      showSignOut: false,
      links: withCurrent(
        [
          { id: "signin", label: "Sign in", href: "/auth/signin" },
          { id: "signup", label: "Sign up", href: "/auth/signup" },
        ],
        pathname,
      ),
    };
  }

  const greeting = role === "trainee" ? "Hello trainee" : role === "trainer" ? "Hello trainer" : null;

  return {
    greeting,
    email,
    showSignOut: true,
    links: withCurrent(
      [
        { id: "home", label: "Home", href: "/" },
        { id: "measurements", label: "Measurements", href: "/dashboard" },
      ],
      pathname,
    ),
  };
}
