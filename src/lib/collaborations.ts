import { topbarName } from "@/lib/topbar";
import type { Collaboration, LinkRequestOutcome } from "@/types";

export const collaborationPageSize = 5;

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
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function pageCountFor(total: number, size: number): number {
  if (!Number.isFinite(total) || total <= 0 || size <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / size));
}

export function toCollaboration(row: CollaborationRow): Collaboration {
  return {
    otherId: row.otherId,
    name: topbarName({ firstName: row.firstName, lastName: row.lastName, email: row.email }),
    email: row.email,
    status: row.status === "accepted" ? "linked" : "pending",
    linkedAt: row.linkedAt,
  };
}

export function requestOutcomeMessage(outcome: LinkRequestOutcome, email: string): string {
  if (outcome === "sent") {
    return `Your request has been sent to ${email}`;
  }
  if (outcome === "pending") {
    return `A request to ${email} is already pending`;
  }
  if (outcome === "linked") {
    return `${email} is already linked`;
  }
  return "No trainee with that email";
}

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
  if (code === "unlinked") {
    return "Trainee unlinked";
  }
  if (code === "removed") {
    return "Trainer removed";
  }
  return null;
}

export function collaborationErrorMessage(code: string | null): string | null {
  if (code === "failed") {
    return "Could not update this collaboration";
  }
  return null;
}
