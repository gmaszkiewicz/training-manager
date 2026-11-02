import { requestFailedMessage } from "@/lib/collaborations";
import { dashboards, type DashboardConfig } from "@/lib/dashboards";
import type { Dashboard } from "@/types";

export const findTraineeTitle = "Find trainee";
export const findTraineeDescription = "Request access to a trainee's dashboards";
export const findTraineePlaceholder = "Find trainee by email, first name or last name";
export const findTraineeTriggerLabel = "Find trainee";
export const requestForLabel = "Request for";
export const requestAccessLabel = "Request access";

/** Search answers nothing below this many characters (spaces aside), so a short query cannot list every trainee. */
export const minTraineeQueryLength = 3;

export function isSearchableTraineeQuery(query: string): boolean {
  return query.replace(/\s+/g, "").length >= minTraineeQueryLength;
}

/** The Request for checkboxes, in dashboard order; a dashboard that has not shipped renders disabled. */
export function requestForOptions(): DashboardConfig[] {
  return dashboards.map(({ id, label, enabled }) => ({ id, label, enabled }));
}

/** Request access is on only while at least one enabled dashboard is selected. */
export function canRequestAccess(selected: readonly Dashboard[]): boolean {
  return dashboards.some((dashboard) => dashboard.enabled && selected.includes(dashboard.id));
}

export type RequestAnswer = { kind: "sent"; message: string } | { kind: "error"; message: string };

const ANSWER_OUTCOMES = ["sent", "pending", "granted", "not_found", "empty", "failed"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnswerOutcome(value: unknown): value is (typeof ANSWER_OUTCOMES)[number] {
  return ANSWER_OUTCOMES.some((outcome) => outcome === value);
}

/** Turns the JSON answer of POST /api/trainer-links into "close + toast" (sent) or "stay + error toast". */
export function readRequestAnswer(value: unknown): RequestAnswer {
  if (!isRecord(value) || !isAnswerOutcome(value.outcome)) {
    return { kind: "error", message: requestFailedMessage };
  }
  const message = typeof value.message === "string" ? value.message.trim() : "";
  if (message === "") {
    return { kind: "error", message: requestFailedMessage };
  }
  return value.outcome === "sent" ? { kind: "sent", message } : { kind: "error", message };
}
