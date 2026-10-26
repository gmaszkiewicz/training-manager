import { describe, expect, it } from "vitest";

import { topbarModel, type TopbarModelInput } from "@/lib/topbar";

const signedIn: Omit<TopbarModelInput, "pathname"> = {
  signedIn: true,
  email: "ada@example.com",
  role: "trainee",
  firstName: null,
  lastName: null,
};

const guest: Omit<TopbarModelInput, "pathname"> = {
  signedIn: false,
  email: "",
  role: null,
  firstName: null,
  lastName: null,
};

const signedInLinks = (current: "home" | "measurements" | null) => [
  { id: "home", label: "Home", href: "/", current: current === "home" },
  { id: "measurements", label: "Measurements", href: "/measurements", current: current === "measurements" },
];

const accountItems = (current: "profile" | "settings" | null) => [
  { id: "profile", label: "Profile", href: "/profile", current: current === "profile" },
  { id: "settings", label: "Settings", href: "/settings", current: current === "settings" },
];

describe("topbarModel", () => {
  it("returns the guest bar with no account and marks Home on /", () => {
    expect(topbarModel({ ...guest, email: "ada@example.com", role: "trainee", pathname: "/" })).toEqual({
      greeting: "Hello, guest",
      email: null,
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
      email: "ada@example.com",
      links: signedInLinks("home"),
      account: { initials: "A", label: "Account menu", items: accountItems(null) },
    });
  });

  it("returns Hello with email for a trainer", () => {
    const result = topbarModel({ ...signedIn, role: "trainer", pathname: "/" });

    expect(result.greeting).toBe("Hello,");
    expect(result.email).toBe("ada@example.com");
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

  it("returns email-only with greeting null when role is null", () => {
    expect(topbarModel({ ...signedIn, role: null, pathname: "/" })).toEqual({
      greeting: null,
      email: "ada@example.com",
      links: signedInLinks("home"),
      account: { initials: "A", label: "Account menu", items: accountItems(null) },
    });
  });
});
