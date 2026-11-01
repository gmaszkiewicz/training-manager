import { describe, expect, it } from "vitest";

import {
  COMPONENTS_INVALID_ERROR,
  COMPONENTS_SAVED_NOTICE,
  COMPONENTS_UNAVAILABLE_ERROR,
  componentFieldName,
  componentsPageError,
  componentsPageNotice,
  moduleFieldName,
  parseComponentSettingsForm,
  versionOptionLabel,
} from "@/lib/component-settings-form";
import { defaultComponentSettings, mergeComponentSettings } from "@/lib/components";

function fields(values: Record<string, string>): [string, string][] {
  return Object.entries(values);
}

describe("parseComponentSettingsForm", () => {
  it("turns module and component fields into an update", () => {
    expect(
      parseComponentSettingsForm(
        fields({
          [moduleFieldName("measurements")]: "on",
          [componentFieldName("new-measurement")]: "1.0",
          [componentFieldName("progression")]: "off",
          [componentFieldName("top-changes")]: "0.1",
        }),
      ),
    ).toEqual({
      ok: true,
      update: {
        modules: { measurements: true },
        components: { "new-measurement": "1.0", progression: "off", "top-changes": "0.1" },
      },
    });
  });

  it("ignores fields with another name", () => {
    expect(parseComponentSettingsForm(fields({ csrf: "x", [moduleFieldName("measurements")]: "off" }))).toEqual({
      ok: true,
      update: { modules: { measurements: false }, components: {} },
    });
  });

  it("keeps the hidden-field versions of a switched-off module", () => {
    const parsed = parseComponentSettingsForm(
      fields({
        [moduleFieldName("measurements")]: "off",
        [componentFieldName("measurements")]: "off",
        [componentFieldName("top-changes")]: "0.1",
      }),
    );
    if (!parsed.ok) {
      throw new Error("expected a valid form");
    }
    const saved = mergeComponentSettings(defaultComponentSettings(), parsed.update);
    expect(saved.modules.measurements).toBe(false);
    expect(saved.components.measurements).toBe("off");
    expect(saved.components["top-changes"]).toBe("0.1");
    expect(saved.components["new-measurement"]).toBe("1.0");
  });

  it("keeps the stored choices of components the form did not send", () => {
    const stored = mergeComponentSettings(defaultComponentSettings(), {
      modules: {},
      components: { "find-trainee": "off" },
    });
    const parsed = parseComponentSettingsForm(fields({ [componentFieldName("new-measurement")]: "off" }));
    if (!parsed.ok) {
      throw new Error("expected a valid form");
    }
    const saved = mergeComponentSettings(stored, parsed.update);
    expect(saved.components["find-trainee"]).toBe("off");
    expect(saved.components["new-measurement"]).toBe("off");
  });

  it("rejects an unknown version, component or module", () => {
    const invalid = { ok: false, code: "components-invalid", error: COMPONENTS_INVALID_ERROR };
    expect(parseComponentSettingsForm(fields({ [componentFieldName("top-changes")]: "1.0" }))).toEqual(invalid);
    expect(parseComponentSettingsForm(fields({ "component.unknown": "1.0" }))).toEqual(invalid);
    expect(parseComponentSettingsForm(fields({ [moduleFieldName("nutrition")]: "on" }))).toEqual(invalid);
    expect(parseComponentSettingsForm(fields({ [moduleFieldName("measurements")]: "yes" }))).toEqual(invalid);
  });
});

describe("version labels", () => {
  it("marks a preview version", () => {
    expect(versionOptionLabel({ id: "0.1", label: "0.1", preview: true })).toBe("v0.1 (preview)");
    expect(versionOptionLabel({ id: "1.0", label: "1.0", preview: false })).toBe("v1.0");
  });
});

describe("componentsPageError", () => {
  it("maps each error code to its copy", () => {
    expect(componentsPageError("components-invalid")).toBe(COMPONENTS_INVALID_ERROR);
    expect(componentsPageError("components-unavailable")).toBe(COMPONENTS_UNAVAILABLE_ERROR);
  });

  it("ignores unknown and missing codes", () => {
    expect(componentsPageError("profile-unavailable")).toBeNull();
    expect(componentsPageError(null)).toBeNull();
  });
});

describe("componentsPageNotice", () => {
  it("maps the saved notice and ignores others", () => {
    expect(componentsPageNotice("components-saved")).toBe(COMPONENTS_SAVED_NOTICE);
    expect(componentsPageNotice("profile-saved")).toBeNull();
    expect(componentsPageNotice(null)).toBeNull();
  });
});
