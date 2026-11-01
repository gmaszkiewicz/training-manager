import { describe, expect, it } from "vitest";

import {
  componentModules,
  componentSettingsSchema,
  componentsForRole,
  componentTiles,
  defaultComponentSettings,
  isComponentShown,
  isModuleOn,
  mergeComponentSettings,
  resolveComponentSettings,
  shownVersion,
  storedComponentSettings,
  tileOf,
} from "@/lib/components";

const DEFAULTS = {
  modules: { measurements: true, nutrition: false, training: false, planning: false },
  components: {
    "new-measurement": "1.0",
    "edit-measurement": "1.0",
    measurements: "1.0",
    "find-trainee": "1.0",
    "trainee-measurements": "1.0",
    progression: "1.0",
    "top-changes": "off",
  },
};

describe("componentModules", () => {
  it("lists the modules in dashboard order with built taken from the dashboards", () => {
    expect(componentModules.map((module) => [module.id, module.built])).toEqual([
      ["measurements", true],
      ["nutrition", false],
      ["training", false],
      ["planning", false],
    ]);
  });
});

describe("componentsForRole", () => {
  it("returns the trainee components in registry order", () => {
    expect(componentsForRole("measurements", "trainee").map((component) => component.label)).toEqual([
      "New measurement",
      "Edit measurement",
      "Your measurements",
      "Progression",
      "Top progression",
    ]);
  });

  it("returns the trainer components in registry order", () => {
    expect(componentsForRole("measurements", "trainer").map((component) => component.label)).toEqual([
      "Find trainee",
      "Measurements for",
      "Progression",
      "Top progression",
    ]);
  });

  it("returns nothing for a module without components", () => {
    expect(componentsForRole("nutrition", "trainee")).toEqual([]);
  });
});

describe("resolveComponentSettings", () => {
  it("resolves null to the defaults", () => {
    expect(resolveComponentSettings(null)).toEqual(DEFAULTS);
    expect(defaultComponentSettings()).toEqual(DEFAULTS);
  });

  it("resolves a non-object to the defaults", () => {
    expect(resolveComponentSettings("on")).toEqual(DEFAULTS);
    expect(resolveComponentSettings([1, 2])).toEqual(DEFAULTS);
  });

  it("keeps stored choices and ignores unknown keys", () => {
    expect(
      resolveComponentSettings({
        modules: { measurements: false, sleep: true },
        components: { "top-changes": "0.1", "weekly-report": "2.0" },
        extra: 1,
      }),
    ).toEqual({
      modules: { ...DEFAULTS.modules, measurements: false },
      components: { ...DEFAULTS.components, "top-changes": "0.1" },
    });
  });

  it("falls back to the default for an unknown version", () => {
    const settings = resolveComponentSettings({ components: { progression: "9.9", "top-changes": "1.0" } });
    expect(settings.components.progression).toBe("1.0");
    expect(settings.components["top-changes"]).toBe("off");
  });

  it("forces an unbuilt module off", () => {
    expect(resolveComponentSettings({ modules: { nutrition: true } }).modules.nutrition).toBe(false);
  });
});

describe("isComponentShown and shownVersion", () => {
  it("shows a component whose module is on and version is not off", () => {
    const settings = defaultComponentSettings();
    expect(isComponentShown(settings, "progression")).toBe(true);
    expect(shownVersion(settings, "progression")).toEqual({ label: "1.0", preview: false });
  });

  it("hides a component set to off", () => {
    const settings = defaultComponentSettings();
    expect(isComponentShown(settings, "top-changes")).toBe(false);
    expect(shownVersion(settings, "top-changes")).toBeNull();
  });

  it("hides every component when its module is off", () => {
    const settings = resolveComponentSettings({
      modules: { measurements: false },
      components: { "top-changes": "0.1" },
    });
    expect(isModuleOn(settings, "measurements")).toBe(false);
    expect(isComponentShown(settings, "new-measurement")).toBe(false);
    expect(isComponentShown(settings, "top-changes")).toBe(false);
    expect(shownVersion(settings, "new-measurement")).toBeNull();
  });

  it("reports a preview version", () => {
    const settings = resolveComponentSettings({ components: { "top-changes": "0.1" } });
    expect(shownVersion(settings, "top-changes")).toEqual({ label: "0.1", preview: true });
  });
});

describe("componentSettingsSchema", () => {
  it("parses a partial submission into an update", () => {
    expect(
      componentSettingsSchema.parse({ modules: { measurements: "off" }, components: { "top-changes": "0.1" } }),
    ).toEqual({ modules: { measurements: false }, components: { "top-changes": "0.1" } });
    expect(componentSettingsSchema.parse({})).toEqual({ modules: {}, components: {} });
  });

  it("accepts off for any component", () => {
    expect(componentSettingsSchema.safeParse({ components: { "new-measurement": "off" } }).success).toBe(true);
  });

  it("rejects an unknown version", () => {
    expect(componentSettingsSchema.safeParse({ components: { progression: "2.0" } }).success).toBe(false);
    expect(componentSettingsSchema.safeParse({ components: { "top-changes": "1.0" } }).success).toBe(false);
  });

  it("rejects a switch on an unbuilt module", () => {
    expect(componentSettingsSchema.safeParse({ modules: { nutrition: "on" } }).success).toBe(false);
  });

  it("rejects unknown keys and module values other than on and off", () => {
    expect(componentSettingsSchema.safeParse({ components: { "weekly-report": "1.0" } }).success).toBe(false);
    expect(componentSettingsSchema.safeParse({ modules: { measurements: "true" } }).success).toBe(false);
    expect(componentSettingsSchema.safeParse({ theme: "dark" }).success).toBe(false);
  });
});

describe("mergeComponentSettings", () => {
  it("applies submitted fields over the current settings and keeps the rest", () => {
    const current = resolveComponentSettings({ components: { "find-trainee": "off" } });
    const update = componentSettingsSchema.parse({ components: { "top-changes": "0.1" } });
    expect(mergeComponentSettings(current, update)).toEqual({
      modules: DEFAULTS.modules,
      components: { ...DEFAULTS.components, "find-trainee": "off", "top-changes": "0.1" },
    });
  });
});

describe("storedComponentSettings", () => {
  it("stores built modules and their components only", () => {
    expect(storedComponentSettings(defaultComponentSettings())).toEqual({
      modules: { measurements: true },
      components: DEFAULTS.components,
    });
  });
});

describe("componentTiles", () => {
  it("shows the default components, hides Top progression and marks no preview", () => {
    const tiles = componentTiles(defaultComponentSettings());

    expect(tiles.progression).toEqual({ shown: true, preview: false });
    expect(tiles["new-measurement"]).toEqual({ shown: true, preview: false });
    expect(tiles["top-changes"]).toEqual({ shown: false, preview: false });
  });

  it("marks the Top progression preview once chosen", () => {
    const tiles = componentTiles(resolveComponentSettings({ components: { "top-changes": "0.1" } }));

    expect(tiles["top-changes"]).toEqual({ shown: true, preview: true });
  });

  it("hides every tile when the module is off", () => {
    const tiles = componentTiles(resolveComponentSettings({ modules: { measurements: false } }));

    expect(Object.values(tiles).every((tile) => !tile.shown)).toBe(true);
  });
});

describe("tileOf", () => {
  it("treats a missing key as shown and not a preview", () => {
    expect(tileOf({}, "progression")).toEqual({ shown: true, preview: false });
    expect(tileOf({ progression: { shown: false, preview: false } }, "progression")).toEqual({
      shown: false,
      preview: false,
    });
  });
});
