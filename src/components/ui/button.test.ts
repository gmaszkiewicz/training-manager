import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it("includes the pressed ring and muted disabled fill for default", () => {
    const classes = buttonVariants({ variant: "default" });

    expect(classes).toContain("aria-pressed:not-disabled:ring-2");
    expect(classes).toContain("aria-pressed:not-disabled:ring-ring");
    expect(classes).toContain("disabled:bg-muted");
    expect(classes).not.toContain("disabled:opacity-50");
  });

  it("includes the pressed ring and muted disabled fill for outline", () => {
    const classes = buttonVariants({ variant: "outline" });

    expect(classes).toContain("aria-pressed:not-disabled:ring-2");
    expect(classes).toContain("aria-pressed:not-disabled:ring-ring");
    expect(classes).toContain("disabled:bg-muted");
    expect(classes).not.toContain("disabled:opacity-50");
  });
});
