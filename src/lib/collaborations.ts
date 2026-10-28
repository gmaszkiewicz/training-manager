import { z } from "zod";

import { topbarName } from "@/lib/topbar";
import type { Collaboration, LinkRequestOutcome } from "@/types";

export const collaborationPageSize = 5;
// Keeps (page - 1) * size well inside the int4 page argument of the list functions.
export const collaborationMaxPage = 10_000;

/** One row of `list_trainer_collaborations` or `list_trainee_collaborations`, with the other side's id. */
export interface CollaborationRow {
  otherId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  linkedAt: string;
}

export function parseCollaborationPage(raw: string | null | undefined): number {
  if (raw == null || !/^\d+$/.test(raw.trim())) {
    return 1;
  }
  const page = Number(raw.trim());
  return Number.isSafeInteger(page) && page >= 1 ? Math.min(page, collaborationMaxPage) : 1;
}

export function pageCountFor(total: number, size: number): number {
  if (!Number.isFinite(total) || total <= 0 || size <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / size));
}

// A trainer link is read access to measurements: granted once accepted, pending otherwise.
export function toCollaboration(row: CollaborationRow): Collaboration {
  return {
    otherId: row.otherId,
    name: topbarName({ firstName: row.firstName, lastName: row.lastName, email: row.email }),
    email: row.email,
    access: {
      measurements: [{ type: "read", pending: row.status !== "accepted" }],
      nutrition: [],
      training: [],
      planning: [],
    },
    linkedAt: row.linkedAt,
  };
}

export function requestOutcomeMessage(outcome: LinkRequestOutcome, email: string): string {
  if (outcome === "sent") {
    return `Your request for read access to measurements has been sent to ${email}`;
  }
  if (outcome === "pending") {
    return `A request for read access to measurements is already pending for ${email}`;
  }
  if (outcome === "granted") {
    return `${email} has already given you read access to measurements`;
  }
  return "No trainee with that email";
}

// `?requested=` only becomes the sent notice when it is an email, so a crafted link cannot show arbitrary text.
export function requestedNoticeEmail(raw: string | null): string | null {
  const parsed = z.email().safeParse(raw?.trim());
  return parsed.success ? parsed.data : null;
}

// The request could not reach the database; kept apart from not_found so an outage never reads as a miss.
export const requestFailedMessage = "Could not send the request. Try again.";

export function collaborationNoticeMessage(code: string | null): string | null {
  if (code === "accepted") {
    return "Request accepted";
  }
  if (code === "declined") {
    return "Request declined";
  }
  if (code === "cancelled") {
    return "Request cancelled";
  }
  // `unlinked` and `removed` come from pages rendered before the revoke intent existed.
  if (code === "revoked" || code === "unlinked" || code === "removed") {
    return "Access revoked";
  }
  return null;
}

export function collaborationErrorMessage(code: string | null): string | null {
  if (code === "failed") {
    return "Could not update this collaboration";
  }
  return null;
}
