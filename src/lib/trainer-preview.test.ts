import { describe, expect, it } from "vitest";

import {
  adjacentTrainerLinks,
  compareTrainees,
  preferredTraineeId,
  selectTrainerPreview,
  traineeName,
  type TrainerLink,
} from "@/lib/trainer-preview";

function link(partial: TrainerLink): TrainerLink {
  return partial;
}

describe("preferredTraineeId", () => {
  it("keeps an explicit trainee query ahead of the remembered id", () => {
    expect(preferredTraineeId("chosen", "remembered")).toBe("chosen");
  });

  it("uses the remembered id when the query is missing", () => {
    expect(preferredTraineeId(null, "remembered")).toBe("remembered");
    expect(preferredTraineeId("", "remembered")).toBe("remembered");
  });

  it("returns null when nothing was chosen", () => {
    expect(preferredTraineeId(null, null)).toBeNull();
    expect(preferredTraineeId("", "")).toBeNull();
  });
});

describe("selectTrainerPreview", () => {
  const alpha = link({
    traineeId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    email: "alpha@example.com",
    linkedAt: "2026-01-01T10:00:00.000Z",
  });
  const beta = link({
    traineeId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "beta@example.com",
    linkedAt: "2026-01-02T10:00:00.000Z",
  });
  const gamma = link({
    traineeId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    email: "gamma@example.com",
    linkedAt: "2026-01-02T10:00:00.000Z",
  });

  it("selects a matching trainee param", () => {
    const result = selectTrainerPreview([beta, alpha], alpha.traineeId);

    expect(result.links.map((item) => item.email)).toEqual(["alpha@example.com", "beta@example.com"]);
    expect(result.selected).toEqual(alpha);
  });

  it("selects the greatest linkedAt when the param is missing", () => {
    const result = selectTrainerPreview([alpha, beta]);

    expect(result.selected).toEqual(beta);
  });

  it("selects the greatest linkedAt when the param matches no link", () => {
    const result = selectTrainerPreview([alpha, beta], "ffffffff-ffff-ffff-ffff-ffffffffffff");

    expect(result.selected).toEqual(beta);
  });

  it("breaks a linkedAt tie with the lower traineeId", () => {
    const result = selectTrainerPreview([gamma, beta]);

    expect(result.selected).toEqual(beta);
  });

  it("orders the links by last name, then first name, with unnamed trainees last", () => {
    const lovelace = link({ ...gamma, email: "a@example.com", firstName: "Ada", lastName: "Lovelace" });
    const babbage = link({ ...alpha, email: "z@example.com", firstName: "Charles", lastName: "Babbage" });
    const unnamed = link({ ...beta, email: "b@example.com" });
    const result = selectTrainerPreview([unnamed, lovelace, babbage]);

    expect(result.links.map((item) => item.email)).toEqual(["z@example.com", "a@example.com", "b@example.com"]);
    expect(result.selected).toEqual(unnamed);
  });

  it("selects nothing for an empty list", () => {
    expect(selectTrainerPreview([])).toEqual({ links: [], selected: null });
    expect(selectTrainerPreview([], alpha.traineeId)).toEqual({ links: [], selected: null });
  });
});

describe("adjacentTrainerLinks", () => {
  const ada = link({
    traineeId: "11111111-1111-1111-1111-111111111111",
    email: "ada@example.com",
    linkedAt: "2026-03-01T10:00:00.000Z",
  });
  const bea = link({
    traineeId: "22222222-2222-2222-2222-222222222222",
    email: "bea@example.com",
    linkedAt: "2026-01-01T10:00:00.000Z",
  });
  const cyd = link({
    traineeId: "33333333-3333-3333-3333-333333333333",
    email: "cyd@example.com",
    linkedAt: "2026-02-01T10:00:00.000Z",
  });
  const links = [ada, bea, cyd];

  it("returns the previous and next links for the middle trainee", () => {
    expect(adjacentTrainerLinks(links, bea.traineeId)).toEqual({
      previous: ada,
      next: cyd,
    });
  });

  it("returns no previous link for the first trainee", () => {
    expect(adjacentTrainerLinks(links, ada.traineeId)).toEqual({
      previous: null,
      next: bea,
    });
  });

  it("returns no next link for the last trainee", () => {
    expect(adjacentTrainerLinks(links, cyd.traineeId)).toEqual({
      previous: bea,
      next: null,
    });
  });

  it("returns no neighbors for a one-link array", () => {
    expect(adjacentTrainerLinks([bea], bea.traineeId)).toEqual({
      previous: null,
      next: null,
    });
  });

  it("returns no neighbors for an id that is not in the array", () => {
    expect(adjacentTrainerLinks(links, "ffffffff-ffff-ffff-ffff-ffffffffffff")).toEqual({
      previous: null,
      next: null,
    });
    expect(adjacentTrainerLinks(links, "")).toEqual({
      previous: null,
      next: null,
    });
  });

  it("follows array order when a later linkedAt sits earlier in the array", () => {
    expect(ada.linkedAt > cyd.linkedAt).toBe(true);
    expect(adjacentTrainerLinks(links, bea.traineeId)).toEqual({
      previous: ada,
      next: cyd,
    });
  });
});

describe("traineeName", () => {
  const email = "ada@example.com";

  it("joins the first name as saved and the last name when both are saved", () => {
    expect(traineeName({ email, firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
    expect(traineeName({ email, firstName: "ada", lastName: "Lovelace" })).toBe("ada Lovelace");
  });

  it("trims each name and joins them with one space", () => {
    expect(traineeName({ email, firstName: "  Ada ", lastName: " Lovelace  " })).toBe("Ada Lovelace");
  });

  it("uses the one saved name alone", () => {
    expect(traineeName({ email, firstName: "Ada", lastName: null })).toBe("Ada");
    expect(traineeName({ email, firstName: " ", lastName: " Lovelace" })).toBe("Lovelace");
  });

  it("falls back to the email when no name is saved", () => {
    expect(traineeName({ email, firstName: null, lastName: "" })).toBe(email);
    expect(traineeName({ email, firstName: "  ", lastName: "  " })).toBe(email);
    expect(traineeName({ email })).toBe(email);
  });
});

describe("compareTrainees", () => {
  function order(trainees: { email: string; firstName?: string | null; lastName?: string | null }[]): string[] {
    return [...trainees].sort(compareTrainees).map((trainee) => trainee.email);
  }

  it("orders by last name, then first name, then email", () => {
    expect(
      order([
        { email: "c@example.com", firstName: "Ada", lastName: "Turing" },
        { email: "b@example.com", firstName: "Bea", lastName: "Lovelace" },
        { email: "z@example.com", firstName: "Ada", lastName: "Lovelace" },
        { email: "a@example.com", firstName: "Ada", lastName: "Lovelace" },
      ]),
    ).toEqual(["a@example.com", "z@example.com", "b@example.com", "c@example.com"]);
  });

  it("puts a blank last name, then a blank first name, after saved ones", () => {
    expect(
      order([
        { email: "a@example.com", firstName: null, lastName: null },
        { email: "b@example.com", firstName: "Ada", lastName: " " },
        { email: "c@example.com", firstName: null, lastName: "Lovelace" },
        { email: "d@example.com", firstName: "Ada", lastName: "Lovelace" },
        { email: "e@example.com", firstName: "Zoe", lastName: null },
      ]),
    ).toEqual(["d@example.com", "c@example.com", "b@example.com", "e@example.com", "a@example.com"]);
  });

  it("ignores case and accents", () => {
    expect(
      compareTrainees(
        { email: "x@example.com", firstName: "Zoé", lastName: "ÉCLAIR" },
        { email: "x@example.com", firstName: "zoe", lastName: "eclair" },
      ),
    ).toBe(0);
    expect(
      order([
        { email: "b@example.com", lastName: "Żak" },
        { email: "a@example.com", lastName: "zak" },
        { email: "c@example.com", lastName: "Ádám" },
      ]),
    ).toEqual(["c@example.com", "a@example.com", "b@example.com"]);
  });
});
