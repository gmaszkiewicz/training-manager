import { describe, expect, it } from "vitest";

import {
  collaborationErrorMessage,
  collaborationMaxPage,
  collaborationNoticeMessage,
  pageCountFor,
  parseCollaborationPage,
  requestFailedMessage,
  requestedNoticeEmail,
  requestOutcomeMessage,
  toCollaboration,
  type CollaborationRow,
} from "@/lib/collaborations";

const row: CollaborationRow = {
  otherId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  status: "accepted",
  linkedAt: "2026-10-27T10:00:00.000Z",
};

describe("parseCollaborationPage", () => {
  it("keeps a positive integer", () => {
    expect(parseCollaborationPage("1")).toBe(1);
    expect(parseCollaborationPage("3")).toBe(3);
  });

  it("falls back to 1 for zero, negative, non-numeric or missing values", () => {
    expect(parseCollaborationPage("0")).toBe(1);
    expect(parseCollaborationPage("-2")).toBe(1);
    expect(parseCollaborationPage("abc")).toBe(1);
    expect(parseCollaborationPage("1.5")).toBe(1);
    expect(parseCollaborationPage("")).toBe(1);
    expect(parseCollaborationPage(null)).toBe(1);
  });

  it("caps a huge page so the list call cannot overflow", () => {
    expect(parseCollaborationPage("99999999999")).toBe(collaborationMaxPage);
    expect(parseCollaborationPage(String(collaborationMaxPage))).toBe(collaborationMaxPage);
  });
});

describe("pageCountFor", () => {
  it("is at least 1 and rounds up", () => {
    expect(pageCountFor(0, 5)).toBe(1);
    expect(pageCountFor(5, 5)).toBe(1);
    expect(pageCountFor(6, 5)).toBe(2);
  });
});

describe("toCollaboration", () => {
  it("maps accepted to linked and formats the name", () => {
    expect(toCollaboration(row)).toEqual({
      otherId: row.otherId,
      name: "A. Lovelace",
      email: "ada@example.com",
      status: "linked",
      linkedAt: row.linkedAt,
    });
  });

  it("keeps pending and falls back to the email without names", () => {
    const collaboration = toCollaboration({ ...row, firstName: null, lastName: null, status: "pending" });
    expect(collaboration.status).toBe("pending");
    expect(collaboration.name).toBe("ada@example.com");
  });
});

describe("requestOutcomeMessage", () => {
  it("names the email for each outcome", () => {
    expect(requestOutcomeMessage("sent", "a@b.pl")).toBe("Your request has been sent to a@b.pl");
    expect(requestOutcomeMessage("pending", "a@b.pl")).toBe("A request to a@b.pl is already pending");
    expect(requestOutcomeMessage("linked", "a@b.pl")).toBe("a@b.pl is already linked");
    expect(requestOutcomeMessage("not_found", "a@b.pl")).toBe("No trainee with that email");
  });

  it("shows the sent notice only for an email", () => {
    expect(requestedNoticeEmail(" a@b.pl ")).toBe("a@b.pl");
    expect(requestedNoticeEmail("Your account is locked")).toBeNull();
    expect(requestedNoticeEmail("")).toBeNull();
    expect(requestedNoticeEmail(null)).toBeNull();
  });

  it("keeps a failed request apart from a miss", () => {
    expect(requestFailedMessage).toBe("Could not send the request. Try again.");
    expect(requestFailedMessage).not.toBe(requestOutcomeMessage("not_found", "a@b.pl"));
  });
});

describe("collaborationNoticeMessage", () => {
  it("maps each notice code", () => {
    expect(collaborationNoticeMessage("accepted")).toBe("Request accepted");
    expect(collaborationNoticeMessage("declined")).toBe("Request declined");
    expect(collaborationNoticeMessage("cancelled")).toBe("Request cancelled");
    expect(collaborationNoticeMessage("unlinked")).toBe("Trainee unlinked");
    expect(collaborationNoticeMessage("removed")).toBe("Trainer removed");
  });

  it("ignores an unknown code", () => {
    expect(collaborationNoticeMessage("saved")).toBe(null);
    expect(collaborationNoticeMessage(null)).toBe(null);
  });
});

describe("collaborationErrorMessage", () => {
  it("maps the failed code and ignores others", () => {
    expect(collaborationErrorMessage("failed")).toBe("Could not update this collaboration");
    expect(collaborationErrorMessage("other")).toBe(null);
    expect(collaborationErrorMessage(null)).toBe(null);
  });
});
