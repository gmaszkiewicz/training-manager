import { describe, expect, it } from "vitest";

import {
  adjacentTrainerLinks,
  preferredTraineeId,
  selectTrainerPreview,
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
