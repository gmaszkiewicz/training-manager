import type { Database } from "@/db/database.types";
import type { PageSize } from "@/lib/measurement-page";

export interface Profile {
  id: string;
  role: "trainee" | "trainer";
}

export type MeasurementField =
  "weight_kg" | "chest_cm" | "waist_cm" | "arms_cm" | "thigh_cm" | "calf_cm" | "hips_cm" | "navel_cm";

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

export interface ProfileDetails {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export type ProfileNames = Pick<ProfileDetails, "firstName" | "lastName">;

export type Dashboard = "measurements" | "nutrition" | "training" | "planning";

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
