import { describe, expect, it } from "vitest";

// Throwaway probe for the main branch rule. Close the pull request without merging.
describe("ci merge gate", () => {
  it("fails on purpose so a red ci check blocks the pull request", () => {
    expect(true).toBe(false);
  });
});
