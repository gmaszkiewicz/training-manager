import { describe, expect, it } from "vitest";

import { topbarModel } from "@/lib/topbar";

describe("topbarModel", () => {
  it("returns the guest bar and marks Home on /", () => {
    expect(topbarModel({ signedIn: false, email: "ada@example.com", role: "trainee", pathname: "/" })).toEqual({
      greeting: "Hello, guest",
      email: null,
      showSignOut: false,
      links: [
        { id: "home", label: "Home", href: "/", current: true },
        { id: "signin", label: "Sign in", href: "/auth/signin", current: false },
        { id: "signup", label: "Sign up", href: "/auth/signup", current: false },
      ],
    });
  });

  it("marks Sign in for a guest on /auth/signin", () => {
    const result = topbarModel({
      signedIn: false,
      email: "",
      role: null,
      pathname: "/auth/signin",
    });

    expect(result.links).toEqual([
      { id: "home", label: "Home", href: "/", current: false },
      { id: "signin", label: "Sign in", href: "/auth/signin", current: true },
      { id: "signup", label: "Sign up", href: "/auth/signup", current: false },
    ]);
  });

  it("marks Sign up for a guest on /auth/signup", () => {
    const result = topbarModel({
      signedIn: false,
      email: "",
      role: null,
      pathname: "/auth/signup",
    });

    expect(result.links).toEqual([
      { id: "home", label: "Home", href: "/", current: false },
      { id: "signin", label: "Sign in", href: "/auth/signin", current: false },
      { id: "signup", label: "Sign up", href: "/auth/signup", current: true },
    ]);
  });

  it("returns Hello with email and marks Home on /", () => {
    expect(
      topbarModel({
        signedIn: true,
        email: "ada@example.com",
        role: "trainee",
        pathname: "/",
      }),
    ).toEqual({
      greeting: "Hello,",
      email: "ada@example.com",
      showSignOut: true,
      links: [
        { id: "home", label: "Home", href: "/", current: true },
        { id: "measurements", label: "Measurements", href: "/measurements", current: false },
      ],
    });
  });

  it("returns Hello with email for a trainer", () => {
    const result = topbarModel({
      signedIn: true,
      email: "ada@example.com",
      role: "trainer",
      pathname: "/",
    });

    expect(result.greeting).toBe("Hello,");
    expect(result.email).toBe("ada@example.com");
    expect(result.showSignOut).toBe(true);
  });

  it("marks Measurements on /measurements with href /measurements and no query", () => {
    const result = topbarModel({
      signedIn: true,
      email: "ada@example.com",
      role: "trainee",
      pathname: "/measurements",
    });

    expect(result.links).toEqual([
      { id: "home", label: "Home", href: "/", current: false },
      { id: "measurements", label: "Measurements", href: "/measurements", current: true },
    ]);
  });

  it("marks nothing for a signed-in user on /auth/signin", () => {
    const result = topbarModel({
      signedIn: true,
      email: "ada@example.com",
      role: "trainee",
      pathname: "/auth/signin",
    });

    expect(result.links.every((link) => !link.current)).toBe(true);
  });

  it("returns email-only with greeting null when role is null", () => {
    expect(
      topbarModel({
        signedIn: true,
        email: "ada@example.com",
        role: null,
        pathname: "/",
      }),
    ).toEqual({
      greeting: null,
      email: "ada@example.com",
      showSignOut: true,
      links: [
        { id: "home", label: "Home", href: "/", current: true },
        { id: "measurements", label: "Measurements", href: "/measurements", current: false },
      ],
    });
  });
});
