import type { Collaboration, Dashboard, DashboardAccess } from "@/types";

export interface DashboardConfig {
  id: Dashboard;
  label: string;
  enabled: boolean;
}

/** Every dashboard in display order; only enabled ones show in the UI and accept access changes. */
export const dashboards: readonly DashboardConfig[] = [
  { id: "measurements", label: "Measurements", enabled: true },
  { id: "nutrition", label: "Nutrition", enabled: false },
  { id: "training", label: "Training", enabled: false },
  { id: "planning", label: "Planning", enabled: false },
];

export function enabledDashboards(): DashboardConfig[] {
  return dashboards.filter((dashboard) => dashboard.enabled);
}

const ACCESS_TYPE_LABELS = { read: "Read" } as const satisfies Record<DashboardAccess["type"], string>;

export function accessLabel(entry: DashboardAccess): string {
  const label = ACCESS_TYPE_LABELS[entry.type];
  return entry.pending ? `${label} · Pending` : label;
}

export function accessSummary(entries: readonly DashboardAccess[]): string {
  return entries.length === 0 ? "—" : entries.map(accessLabel).join(", ");
}

export function hasGrantedAccess(collaboration: Pick<Collaboration, "access">, dashboard: Dashboard): boolean {
  return collaboration.access[dashboard].some((entry) => !entry.pending);
}

export function hasPendingAccess(collaboration: Pick<Collaboration, "access">, dashboard: Dashboard): boolean {
  return collaboration.access[dashboard].some((entry) => entry.pending);
}
