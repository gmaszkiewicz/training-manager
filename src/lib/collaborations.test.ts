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
  it("maps accepted to granted read access to measurements and formats the name", () => {
    expect(toCollaboration(row)).toEqual({
      otherId: row.otherId,
      name: "A. Lovelace",
      email: "ada@example.com",
      access: {
        measurements: [{ type: "read", pending: false }],
        nutrition: [],
        training: [],
        planning: [],
      },
      linkedAt: row.linkedAt,
    });
  });

  it("maps pending to pending read access and falls back to the email without names", () => {
    const collaboration = toCollaboration({ ...row, firstName: null, lastName: null, status: "pending" });
    expect(collaboration.access).toEqual({
      measurements: [{ type: "read", pending: true }],
      nutrition: [],
      training: [],
      planning: [],
    });
    expect(collaboration.name).toBe("ada@example.com");
  });

  it("treats an unknown status as pending", () => {
    expect(toCollaboration({ ...row, status: "other" }).access.measurements).toEqual([{ type: "read", pending: true }]);
  });
});

describe("requestOutcomeMessage", () => {
  it("names the email for each outcome", () => {
    expect(requestOutcomeMessage("sent", "a@b.pl")).toBe(
      "Your request for read access to measurements has been sent to a@b.pl",
    );
    expect(requestOutcomeMessage("pending", "a@b.pl")).toBe(
      "A request for read access to measurements is already pending for a@b.pl",
    );
    expect(requestOutcomeMessage("granted", "a@b.pl")).toBe("a@b.pl has already given you read access to measurements");
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
    expect(collaborationNoticeMessage("revoked")).toBe("Access revoked");
  });

  it("maps the legacy unlinked and removed codes to the revoked notice", () => {
    expect(collaborationNoticeMessage("unlinked")).toBe("Access revoked");
    expect(collaborationNoticeMessage("removed")).toBe("Access revoked");
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
