import { describe, expect, it } from "vitest";

import { requestFailedMessage, requestOutcomeMessage } from "@/lib/collaborations";
import { canRequestAccess, readRequestAnswer, requestForOptions } from "@/lib/find-trainee";

describe("requestForOptions", () => {
  it("lists the four dashboards in order with only Measurements enabled", () => {
    expect(requestForOptions()).toEqual([
      { id: "measurements", label: "Measurements", enabled: true },
      { id: "nutrition", label: "Nutrition", enabled: false },
      { id: "training", label: "Training", enabled: false },
      { id: "planning", label: "Planning", enabled: false },
    ]);
  });
});

describe("canRequestAccess", () => {
  it("is false with nothing selected", () => {
    expect(canRequestAccess([])).toBe(false);
  });

  it("is true with Measurements selected", () => {
    expect(canRequestAccess(["measurements"])).toBe(true);
    expect(canRequestAccess(["nutrition", "measurements"])).toBe(true);
  });

  it("is false with only disabled dashboards selected", () => {
    expect(canRequestAccess(["nutrition", "training", "planning"])).toBe(false);
  });
});

describe("readRequestAnswer", () => {
  const email = "ada@example.com";

  it("reads sent as close + toast", () => {
    const message = requestOutcomeMessage("sent", email);
    expect(readRequestAnswer({ outcome: "sent", message })).toEqual({ kind: "sent", message });
  });

  it.each(["pending", "granted", "not_found"] as const)("reads %s as stay + message", (outcome) => {
    const message = requestOutcomeMessage(outcome, email);
    expect(readRequestAnswer({ outcome, message })).toEqual({ kind: "error", message });
  });

  it("reads empty and failed as stay + message", () => {
    expect(readRequestAnswer({ outcome: "empty", message: "Enter an email address" })).toEqual({
      kind: "error",
      message: "Enter an email address",
    });
    expect(readRequestAnswer({ outcome: "failed", message: requestFailedMessage })).toEqual({
      kind: "error",
      message: requestFailedMessage,
    });
  });

  it.each([
    ["null", null],
    ["a string", "sent"],
    ["an unknown outcome", { outcome: "maybe", message: "Hi" }],
    ["a missing message", { outcome: "sent" }],
    ["a blank message", { outcome: "not_found", message: "  " }],
    ["a non-string message", { outcome: "sent", message: 42 }],
  ])("falls back to the failed message for %s", (_label, value) => {
    expect(readRequestAnswer(value)).toEqual({ kind: "error", message: requestFailedMessage });
  });
});
