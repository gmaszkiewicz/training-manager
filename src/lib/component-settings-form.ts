import { componentSettingsSchema, type ComponentSettingsUpdate, type ComponentVersion } from "@/lib/components";
import type { ComponentId, ModuleId } from "@/types";

export const COMPONENTS_SAVED_NOTICE = "Components saved";
export const COMPONENTS_UNAVAILABLE_ERROR = "We could not save your components. Try again later.";
export const COMPONENTS_INVALID_ERROR = "Some component choices are not valid. Reload the page and try again.";
export const COMPONENTS_LOAD_ERROR = "We could not load your components. Try again later.";
export const MODULE_NOT_BUILT_NOTE = "Not available yet";

export type ComponentSettingsErrorCode = "components-invalid" | "components-unavailable";

const MODULE_PREFIX = "module.";
const COMPONENT_PREFIX = "component.";

export const moduleFieldName = (moduleId: ModuleId): string => `${MODULE_PREFIX}${moduleId}`;
export const componentFieldName = (componentId: ComponentId): string => `${COMPONENT_PREFIX}${componentId}`;

export const OFF_OPTION_LABEL = "Off";

/** The select label of a version: "v1.0", or "v0.1 (preview)" for a preview version. */
export function versionOptionLabel(version: ComponentVersion): string {
  return version.preview ? `v${version.label} (preview)` : `v${version.label}`;
}

/**
 * Turns the posted `module.<id>` and `component.<id>` fields into the schema's input shape. Fields with another
 * name are ignored; the schema rejects unknown module or component ids.
 */
export function componentFormInput(entries: Iterable<[string, unknown]>): {
  modules: Record<string, unknown>;
  components: Record<string, unknown>;
} {
  const modules: Record<string, unknown> = {};
  const components: Record<string, unknown> = {};
  for (const [name, value] of entries) {
    if (name.startsWith(MODULE_PREFIX)) {
      modules[name.slice(MODULE_PREFIX.length)] = value;
    } else if (name.startsWith(COMPONENT_PREFIX)) {
      components[name.slice(COMPONENT_PREFIX.length)] = value;
    }
  }
  return { modules, components };
}

export function parseComponentSettingsForm(
  entries: Iterable<[string, unknown]>,
): { ok: true; update: ComponentSettingsUpdate } | { ok: false; code: "components-invalid"; error: string } {
  const parsed = componentSettingsSchema.safeParse(componentFormInput(entries));
  if (!parsed.success) {
    return { ok: false, code: "components-invalid", error: COMPONENTS_INVALID_ERROR };
  }
  return { ok: true, update: parsed.data };
}

export function componentsPageError(code: string | null): string | null {
  if (code === "components-invalid") {
    return COMPONENTS_INVALID_ERROR;
  }
  if (code === "components-unavailable") {
    return COMPONENTS_UNAVAILABLE_ERROR;
  }
  return null;
}

export function componentsPageNotice(code: string | null): string | null {
  return code === "components-saved" ? COMPONENTS_SAVED_NOTICE : null;
}
