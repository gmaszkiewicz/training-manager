import type { Database } from "@/db/database.types";
import type { ChartWindow } from "@/lib/measurement-chart";
import type { PageSize } from "@/lib/measurement-page";

export interface Profile {
  id: string;
  role: "trainee" | "trainer";
}

export type MeasurementField =
  "weight_kg" | "chest_cm" | "waist_cm" | "arms_cm" | "thigh_cm" | "calf_cm" | "hips_cm" | "navel_cm";

export type CircumferenceField = Exclude<MeasurementField, "weight_kg">;

export type MeasurementEntry = Omit<Database["public"]["Tables"]["measurements"]["Row"], "trainee_id">;

export interface FieldDelta {
  direction: "up" | "down" | "none";
  difference: number;
}

export type MeasurementWithDeltas = MeasurementEntry & {
  deltas: Record<MeasurementField, FieldDelta> | null;
};

/** A chart read entry: its deltas are against the journal entry measured at `previous_measured_on`. */
export type ChartMeasurement = MeasurementWithDeltas & {
  previous_measured_on: string | null;
};

/** A chart read: the entries in the window and the window itself (`null` for a read by ids). */
export interface ChartBody {
  entries: ChartMeasurement[];
  window: ChartWindow | null;
}

export interface ProfileDetails {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Profile["role"] | null;
}

export type ProfileNames = Pick<ProfileDetails, "firstName" | "lastName">;

export type Dashboard = "measurements" | "nutrition" | "training" | "planning";

/** A module on the components screen; one per dashboard. */
export type ModuleId = Dashboard;

export type ComponentId =
  | "new-measurement"
  | "edit-measurement"
  | "measurements"
  | "find-trainee"
  | "trainee-picker"
  | "trainee-measurements"
  | "progression"
  | "top-changes";

/** A user's resolved choices: every module on or off, every component at a version id or `"off"`. */
export interface ComponentSettings {
  modules: Record<ModuleId, boolean>;
  components: Record<ComponentId, string>;
}

/** How far a component version is from release: stable, a release candidate, or a preview. */
export type VersionStage = "stable" | "rc" | "preview";

/**
 * How a component's tile renders on `/measurements`: whether it shows, its version's stage (the badge) and the version
 * id (which island renders). `stage` and `version` are `null` when the tile is not shown.
 */
export interface ComponentTile {
  shown: boolean;
  stage: VersionStage | null;
  version: string | null;
}

/** Per-component tile states; a missing key renders as shown, stable and of no particular version (the kitchen sinks). */
export type ComponentTiles = Partial<Record<ComponentId, ComponentTile>>;

export type AccessType = "read";

/** One kind of access to a dashboard; `pending` until the trainee accepts the request. */
export interface DashboardAccess {
  type: AccessType;
  pending: boolean;
}

export interface Collaboration {
  otherId: string;
  name: string;
  email: string;
  access: Record<Dashboard, DashboardAccess[]>;
  linkedAt: string;
}

export interface CollaborationPage {
  rows: Collaboration[];
  page: number;
  pageCount: number;
  pageSize: 5;
}

/** One unlinked trainee matching a trainer's name or email search. */
export interface TraineeMatch {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export type LinkRequestOutcome = "sent" | "pending" | "granted" | "not_found";

export type NotificationKind = "link_requested" | "link_accepted" | "link_declined" | "link_cancelled" | "link_removed";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actorRole: Profile["role"];
  actorFirstName: string | null;
  actorLastName: string | null;
  actorEmail: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  rows: AppNotification[];
  page: number;
  pageCount: number;
  size: PageSize;
  total: number;
}

export interface NotificationBellData {
  unreadCount: number;
  latest: AppNotification[];
}

/** The signed-in user as read from verified session JWT claims. */
export interface SessionUser {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
}
