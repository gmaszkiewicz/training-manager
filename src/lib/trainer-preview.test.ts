import { describe, expect, it } from "vitest";

import { selectTrainerPreview, type TrainerLink } from "@/lib/trainer-preview";

function link(partial: TrainerLink): TrainerLink {
  return partial;
}

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
