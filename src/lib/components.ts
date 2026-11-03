import { z } from "zod";

import { dashboards } from "@/lib/dashboards";
import type {
  ComponentId,
  ComponentSettings,
  ComponentTile,
  ComponentTiles,
  ModuleId,
  Profile,
  VersionStage,
} from "@/types";

export const COMPONENT_OFF = "off";

export interface ComponentVersion {
  id: string;
  label: string;
  /** `stable` carries no badge, a release candidate the yellow "RC" one, a preview the red "Preview" one. */
  stage: VersionStage;
}

export interface ComponentConfig {
  id: ComponentId;
  label: string;
  roles: readonly Profile["role"][];
  versions: readonly ComponentVersion[];
  /** A version id from `versions`, or `"off"`. */
  defaultVersion: string;
  /** The component cannot be switched off: `"off"` is never offered, accepted or resolved. */
  required?: boolean;
}

export interface ComponentModule {
  id: ModuleId;
  label: string;
  /** Taken from the dashboard's `enabled`; an unbuilt module is always off. */
  built: boolean;
  defaultOn: boolean;
  components: readonly ComponentConfig[];
}

const STABLE: readonly ComponentVersion[] = [{ id: "1.0", label: "1.0", stage: "stable" }];

const MODULE_COMPONENTS: Record<ModuleId, { defaultOn: boolean; components: readonly ComponentConfig[] }> = {
  measurements: {
    defaultOn: true,
    components: [
      { id: "new-measurement", label: "New measurement", roles: ["trainee"], versions: STABLE, defaultVersion: "1.0" },
      {
        id: "edit-measurement",
        label: "Edit measurement",
        roles: ["trainee"],
        versions: STABLE,
        defaultVersion: "1.0",
      },
      { id: "measurements", label: "Your measurements", roles: ["trainee"], versions: STABLE, defaultVersion: "1.0" },
      { id: "find-trainee", label: "Find trainee", roles: ["trainer"], versions: STABLE, defaultVersion: "1.0" },
      {
        id: "trainee-picker",
        label: "Choose trainee",
        roles: ["trainer"],
        versions: STABLE,
        defaultVersion: "1.0",
        required: true,
      },
      {
        id: "trainee-measurements",
        label: "Measurements",
        roles: ["trainer"],
        versions: STABLE,
        defaultVersion: "1.0",
      },
      {
        id: "progression",
        label: "Progression",
        roles: ["trainee", "trainer"],
        versions: STABLE,
        defaultVersion: "1.0",
      },
      {
        id: "top-changes",
        label: "Top progression",
        roles: ["trainee", "trainer"],
        versions: [
          { id: "0.1", label: "0.1", stage: "preview" },
          { id: "0.9", label: "0.9", stage: "rc" },
        ],
        defaultVersion: "0.9",
      },
    ],
  },
  nutrition: { defaultOn: false, components: [] },
  training: { defaultOn: false, components: [] },
  planning: { defaultOn: false, components: [] },
};

/** Every module in dashboard order with its components; the single source of truth for component choices. */
export const componentModules: readonly ComponentModule[] = dashboards.map((dashboard) => ({
  id: dashboard.id,
  label: dashboard.label,
  built: dashboard.enabled,
  ...MODULE_COMPONENTS[dashboard.id],
}));

const allComponents: readonly (ComponentConfig & { moduleId: ModuleId })[] = componentModules.flatMap((module) =>
  module.components.map((component) => ({ ...component, moduleId: module.id })),
);

function componentConfig(componentId: ComponentId): ComponentConfig & { moduleId: ModuleId } {
  const component = allComponents.find((candidate) => candidate.id === componentId);
  if (!component) {
    throw new Error(`Unknown component: ${componentId}`);
  }
  return component;
}

function isKnownChoice(component: ComponentConfig, value: unknown): value is string {
  return (value === COMPONENT_OFF && !component.required) || component.versions.some((version) => version.id === value);
}

export function componentsForRole(moduleId: ModuleId, role: Profile["role"]): ComponentConfig[] {
  const module = componentModules.find((candidate) => candidate.id === moduleId);
  return module ? module.components.filter((component) => component.roles.includes(role)) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Resolves a stored (or any) value to a choice for every registry key. Unknown keys are ignored, an unknown
 * or missing value falls back to the default, and an unbuilt module is always off.
 */
export function resolveComponentSettings(raw: unknown): ComponentSettings {
  const record = asRecord(raw);
  const storedModules = asRecord(record.modules);
  const storedComponents = asRecord(record.components);

  const modules = {} as ComponentSettings["modules"];
  for (const module of componentModules) {
    const stored = storedModules[module.id];
    modules[module.id] = module.built && (typeof stored === "boolean" ? stored : module.defaultOn);
  }

  const components = {} as ComponentSettings["components"];
  for (const component of allComponents) {
    const stored = storedComponents[component.id];
    components[component.id] = isKnownChoice(component, stored) ? stored : component.defaultVersion;
  }

  return { modules, components };
}

export const defaultComponentSettings = (): ComponentSettings => resolveComponentSettings(null);

/** A validated form submission: only the fields the form sent, ready to merge over the stored settings. */
export interface ComponentSettingsUpdate {
  modules: Partial<Record<ModuleId, boolean>>;
  components: Partial<Record<ComponentId, string>>;
}

const builtModules = componentModules.filter((module) => module.built);

function choiceSchema(component: ComponentConfig) {
  const versionIds = component.versions.map((version) => version.id);
  const [first, ...rest] = component.required ? versionIds : [...versionIds, COMPONENT_OFF];
  return z.enum([first, ...rest]);
}

/**
 * Validates a submitted form: known keys only, component values from the registry (or `"off"`), and module
 * switches `on`/`off` only for built modules. Every field is optional, so a form may send just one role's components.
 */
export const componentSettingsSchema = z
  .strictObject({
    modules: z
      .strictObject(
        Object.fromEntries(builtModules.map((module) => [module.id, z.enum(["on", "off"]).optional()])) as Record<
          string,
          z.ZodOptional<z.ZodType<"on" | "off">>
        >,
      )
      .optional(),
    components: z
      .strictObject(
        Object.fromEntries(
          builtModules.flatMap((module) =>
            module.components.map((component) => [component.id, choiceSchema(component).optional()]),
          ),
        ) as Record<string, z.ZodOptional<z.ZodType<string>>>,
      )
      .optional(),
  })
  .transform((input): ComponentSettingsUpdate => {
    const modules: ComponentSettingsUpdate["modules"] = {};
    for (const [id, value] of Object.entries(input.modules ?? {})) {
      if (value !== undefined) {
        modules[id as ModuleId] = value === "on";
      }
    }
    const components: ComponentSettingsUpdate["components"] = {};
    for (const [id, value] of Object.entries(input.components ?? {})) {
      if (value !== undefined) {
        components[id as ComponentId] = value;
      }
    }
    return { modules, components };
  });

/** Applies a submitted update over the current settings and resolves the result again. */
export function mergeComponentSettings(current: ComponentSettings, update: ComponentSettingsUpdate): ComponentSettings {
  return resolveComponentSettings({
    modules: { ...current.modules, ...update.modules },
    components: { ...current.components, ...update.components },
  });
}

/** The value to store: built modules and their components only. */
export function storedComponentSettings(settings: ComponentSettings): {
  modules: Partial<Record<ModuleId, boolean>>;
  components: Partial<Record<ComponentId, string>>;
} {
  const resolved = resolveComponentSettings(settings);
  const modules: Partial<Record<ModuleId, boolean>> = {};
  const components: Partial<Record<ComponentId, string>> = {};
  for (const module of builtModules) {
    modules[module.id] = resolved.modules[module.id];
    for (const component of module.components) {
      components[component.id] = resolved.components[component.id];
    }
  }
  return { modules, components };
}

export function isModuleOn(settings: ComponentSettings, moduleId: ModuleId): boolean {
  return settings.modules[moduleId];
}

export function isComponentShown(settings: ComponentSettings, componentId: ComponentId): boolean {
  const { moduleId } = componentConfig(componentId);
  return isModuleOn(settings, moduleId) && settings.components[componentId] !== COMPONENT_OFF;
}

export function shownVersion(
  settings: ComponentSettings,
  componentId: ComponentId,
): { id: string; label: string; stage: VersionStage } | null {
  if (!isComponentShown(settings, componentId)) {
    return null;
  }
  const version = componentConfig(componentId).versions.find(
    (candidate) => candidate.id === settings.components[componentId],
  );
  return version ? { id: version.id, label: version.label, stage: version.stage } : null;
}

/** Every component's tile state for the given settings: shown when on, with the shown version's stage and id. */
export function componentTiles(settings: ComponentSettings): Required<ComponentTiles> {
  const tiles = {} as Required<ComponentTiles>;
  for (const component of allComponents) {
    const version = shownVersion(settings, component.id);
    tiles[component.id] =
      version === null
        ? { shown: false, stage: null, version: null }
        : { shown: true, stage: version.stage, version: version.id };
  }
  return tiles;
}

const defaultTile: ComponentTile = { shown: true, stage: "stable", version: null };

/** A tile's state from a partial map; a missing key is shown, stable and of no particular version. */
export function tileOf(tiles: ComponentTiles, componentId: ComponentId): ComponentTile {
  return tiles[componentId] ?? defaultTile;
}
