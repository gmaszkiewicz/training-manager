import { describe, expect, it } from "vitest";

import {
  accessLabel,
  accessSummary,
  dashboards,
  enabledDashboards,
  hasGrantedAccess,
  hasPendingAccess,
} from "@/lib/dashboards";
import type { Collaboration } from "@/types";

function withMeasurements(access: Collaboration["access"]["measurements"]): Pick<Collaboration, "access"> {
  return { access: { measurements: access, nutrition: [], training: [], planning: [] } };
}

describe("dashboards", () => {
  it("lists every dashboard in order", () => {
    expect(dashboards.map((dashboard) => dashboard.label)).toEqual([
      "Measurements",
      "Nutrition",
      "Training",
      "Planning",
    ]);
  });

  it("enables only Measurements", () => {
    expect(enabledDashboards()).toEqual([{ id: "measurements", label: "Measurements", enabled: true }]);
  });
});

describe("accessLabel", () => {
  it("labels granted and pending read access", () => {
    expect(accessLabel({ type: "read", pending: false })).toBe("Read");
    expect(accessLabel({ type: "read", pending: true })).toBe("Read · Pending");
  });
});

describe("accessSummary", () => {
  it("shows a dash for no access", () => {
    expect(accessSummary([])).toBe("—");
  });

  it("shows one entry", () => {
    expect(accessSummary([{ type: "read", pending: true }])).toBe("Read · Pending");
  });

  it("joins several entries with a comma", () => {
    expect(
      accessSummary([
        { type: "read", pending: false },
        { type: "read", pending: true },
      ]),
    ).toBe("Read, Read · Pending");
  });
});

describe("hasGrantedAccess and hasPendingAccess", () => {
  it("reads granted access", () => {
    const collaboration = withMeasurements([{ type: "read", pending: false }]);
    expect(hasGrantedAccess(collaboration, "measurements")).toBe(true);
    expect(hasPendingAccess(collaboration, "measurements")).toBe(false);
  });

  it("reads pending access", () => {
    const collaboration = withMeasurements([{ type: "read", pending: true }]);
    expect(hasGrantedAccess(collaboration, "measurements")).toBe(false);
    expect(hasPendingAccess(collaboration, "measurements")).toBe(true);
  });

  it("is false for a dashboard without access", () => {
    const collaboration = withMeasurements([{ type: "read", pending: false }]);
    expect(hasGrantedAccess(collaboration, "nutrition")).toBe(false);
    expect(hasPendingAccess(collaboration, "nutrition")).toBe(false);
  });
});
