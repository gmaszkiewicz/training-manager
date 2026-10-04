import { describe, expect, it } from "vitest";

import { formatDelta, withDeltas } from "@/lib/measurement-deltas";
import type { MeasurementEntry } from "@/types";

function entry(
  partial: Pick<MeasurementEntry, "id" | "measured_on" | "created_at" | "weight_kg"> & Partial<MeasurementEntry>,
): MeasurementEntry {
  return {
    arms_cm: 50,
    calf_cm: 50,
    chest_cm: 50,
    hips_cm: 50,
    navel_cm: 50,
    note: null,
    thigh_cm: 50,
    waist_cm: 50,
    ...partial,
  };
}

describe("withDeltas", () => {
  it("returns an empty list", () => {
    expect(withDeltas([])).toEqual([]);
  });

  it("gives a single entry null deltas", () => {
    const only = entry({
      id: "only",
      measured_on: "2026-09-10",
      created_at: "2026-09-10T08:00:00.000Z",
      weight_kg: 80,
    });

    expect(withDeltas([only])).toEqual([{ ...only, deltas: null }]);
  });

  it("shows a decrease of 1.5 kg", () => {
    const result = withDeltas([
      entry({ id: "a", measured_on: "2026-09-10", created_at: "2026-09-10T08:00:00.000Z", weight_kg: 80 }),
      entry({ id: "b", measured_on: "2026-09-11", created_at: "2026-09-11T08:00:00.000Z", weight_kg: 78.5 }),
    ]);

    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "down", difference: 1.5 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↓ 1.5");
    }
    expect(result[0]?.deltas).toEqual({
      weight_kg: { direction: "down", difference: 1.5 },
      chest_cm: { direction: "none", difference: 0 },
      waist_cm: { direction: "none", difference: 0 },
      arms_cm: { direction: "none", difference: 0 },
      thigh_cm: { direction: "none", difference: 0 },
      calf_cm: { direction: "none", difference: 0 },
      hips_cm: { direction: "none", difference: 0 },
      navel_cm: { direction: "none", difference: 0 },
    });
    expect(result[1]?.deltas).toBeNull();
  });

  it("shows an increase of 0.2 without a float artifact", () => {
    const result = withDeltas([
      entry({ id: "a", measured_on: "2026-09-10", created_at: "2026-09-10T08:00:00.000Z", weight_kg: 80.1 }),
      entry({ id: "b", measured_on: "2026-09-11", created_at: "2026-09-11T08:00:00.000Z", weight_kg: 80.3 }),
    ]);

    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 0.2 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↑ 0.2");
    }
  });

  it("shows no arrow when values are equal", () => {
    const result = withDeltas([
      entry({ id: "a", measured_on: "2026-09-10", created_at: "2026-09-10T08:00:00.000Z", weight_kg: 80 }),
      entry({ id: "b", measured_on: "2026-09-11", created_at: "2026-09-11T08:00:00.000Z", weight_kg: 80 }),
    ]);

    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "none", difference: 0 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("0.0");
    }
  });

  it("returns newest first when the input is unsorted", () => {
    const oldest = entry({
      id: "old",
      measured_on: "2026-09-01",
      created_at: "2026-09-01T08:00:00.000Z",
      weight_kg: 70,
    });
    const middle = entry({
      id: "mid",
      measured_on: "2026-09-15",
      created_at: "2026-09-15T08:00:00.000Z",
      weight_kg: 71,
    });
    const newest = entry({
      id: "new",
      measured_on: "2026-09-20",
      created_at: "2026-09-20T08:00:00.000Z",
      weight_kg: 72,
    });
    const input = [middle, newest, oldest];

    expect(withDeltas(input).map((item) => item.id)).toEqual(["new", "mid", "old"]);
    expect(input.map((item) => item.id)).toEqual(["mid", "new", "old"]);
  });

  it("slots a backfilled date between its neighbors", () => {
    const september10 = entry({
      id: "sep-10",
      measured_on: "2026-09-10",
      created_at: "2026-09-10T08:00:00.000Z",
      weight_kg: 80,
    });
    const september20 = entry({
      id: "sep-20",
      measured_on: "2026-09-20",
      created_at: "2026-09-20T08:00:00.000Z",
      weight_kg: 78,
    });
    const september15 = entry({
      id: "sep-15",
      measured_on: "2026-09-15",
      created_at: "2026-09-25T08:00:00.000Z",
      weight_kg: 79,
    });

    const result = withDeltas([september10, september20, september15]);

    expect(result.map((item) => item.measured_on)).toEqual(["2026-09-20", "2026-09-15", "2026-09-10"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "down", difference: 1 });
    expect(result[1]?.deltas?.weight_kg).toEqual({ direction: "down", difference: 1 });
    const september20Deltas = result[0]?.deltas;
    const september15Deltas = result[1]?.deltas;
    if (september20Deltas && september15Deltas) {
      expect(formatDelta(september20Deltas.weight_kg)).toBe("↓ 1.0");
      expect(formatDelta(september15Deltas.weight_kg)).toBe("↓ 1.0");
    }
    expect(result[2]?.deltas).toBeNull();
  });

  it("compares same-date entries in created_at order", () => {
    const earlier = entry({
      id: "earlier",
      measured_on: "2026-09-10",
      created_at: "2026-09-10T08:00:00.000Z",
      weight_kg: 80,
    });
    const later = entry({
      id: "later",
      measured_on: "2026-09-10",
      created_at: "2026-09-10T18:00:00.000Z",
      weight_kg: 81,
    });

    const result = withDeltas([later, earlier]);

    expect(result.map((item) => item.id)).toEqual(["later", "earlier"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 1 });
    const laterDeltas = result[0]?.deltas;
    if (laterDeltas) {
      expect(formatDelta(laterDeltas.weight_kg)).toBe("↑ 1.0");
    }
    expect(result[1]?.deltas).toBeNull();
  });

  it("breaks a same-date and same-created_at tie by id", () => {
    const first = entry({
      id: "a",
      measured_on: "2026-09-10",
      created_at: "2026-09-10T08:00:00.000Z",
      weight_kg: 80,
    });
    const second = entry({
      id: "b",
      measured_on: "2026-09-10",
      created_at: "2026-09-10T08:00:00.000Z",
      weight_kg: 82,
    });

    const result = withDeltas([second, first]);

    expect(result.map((item) => item.id)).toEqual(["b", "a"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 2 });
    expect(result[1]?.deltas).toBeNull();
  });

  it("shows an increase of 2 kg on the starting pair", () => {
    const a = entry({
      id: "a",
      measured_on: "2026-01-01",
      created_at: "2026-01-01T08:00:00.000Z",
      weight_kg: 80,
    });
    const b = entry({
      id: "b",
      measured_on: "2026-01-08",
      created_at: "2026-01-08T08:00:00.000Z",
      weight_kg: 82,
    });

    const result = withDeltas([b, a]);

    expect(result.map((item) => item.id)).toEqual(["b", "a"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 2 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↑ 2.0");
    }
    expect(result[1]?.deltas).toBeNull();
  });

  it("shows an increase of 1 kg after the earlier weight is saved as 81", () => {
    const a = entry({
      id: "a",
      measured_on: "2026-01-01",
      created_at: "2026-01-01T08:00:00.000Z",
      weight_kg: 81,
    });
    const b = entry({
      id: "b",
      measured_on: "2026-01-08",
      created_at: "2026-01-08T08:00:00.000Z",
      weight_kg: 82,
    });

    const result = withDeltas([b, a]);

    expect(result.map((item) => item.id)).toEqual(["b", "a"]);
    expect(result[0]?.measured_on).toBe("2026-01-08");
    expect(result[1]?.measured_on).toBe("2026-01-01");
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 1 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↑ 1.0");
    }
    expect(result[1]?.deltas).toBeNull();
  });

  it("shows a decrease of 2 kg after the later date moves to 2025-12-28", () => {
    const a = entry({
      id: "a",
      measured_on: "2026-01-01",
      created_at: "2026-01-01T08:00:00.000Z",
      weight_kg: 80,
    });
    const b = entry({
      id: "b",
      measured_on: "2025-12-28",
      created_at: "2026-01-08T08:00:00.000Z",
      weight_kg: 82,
    });

    const result = withDeltas([b, a]);

    expect(result.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result[1]?.measured_on).toBe("2025-12-28");
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "down", difference: 2 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↓ 2.0");
    }
    expect(result[1]?.deltas).toBeNull();
  });

  it("shows C down 1 kg and B up 2 kg before a delete", () => {
    const a = entry({
      id: "a",
      measured_on: "2026-01-01",
      created_at: "2026-01-01T08:00:00.000Z",
      weight_kg: 80,
    });
    const b = entry({
      id: "b",
      measured_on: "2026-01-08",
      created_at: "2026-01-08T08:00:00.000Z",
      weight_kg: 82,
    });
    const c = entry({
      id: "c",
      measured_on: "2026-01-15",
      created_at: "2026-01-15T08:00:00.000Z",
      weight_kg: 81,
    });

    const result = withDeltas([a, c, b]);

    expect(result.map((item) => item.id)).toEqual(["c", "b", "a"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "down", difference: 1 });
    expect(result[1]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 2 });
    const cDeltas = result[0]?.deltas;
    if (cDeltas) {
      expect(formatDelta(cDeltas.weight_kg)).toBe("↓ 1.0");
    }
    const bDeltas = result[1]?.deltas;
    if (bDeltas) {
      expect(formatDelta(bDeltas.weight_kg)).toBe("↑ 2.0");
    }
    expect(result[2]?.deltas).toBeNull();
  });

  it("shows an increase of 1 kg on C after the middle row is removed", () => {
    const a = entry({
      id: "a",
      measured_on: "2026-01-01",
      created_at: "2026-01-01T08:00:00.000Z",
      weight_kg: 80,
    });
    const c = entry({
      id: "c",
      measured_on: "2026-01-15",
      created_at: "2026-01-15T08:00:00.000Z",
      weight_kg: 81,
    });

    const result = withDeltas([a, c]);

    expect(result.map((item) => item.id)).toEqual(["c", "a"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 1 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↑ 1.0");
    }
    expect(result[1]?.deltas).toBeNull();
  });

  it("shows an increase of 2 kg on B after the latest row is removed", () => {
    const a = entry({
      id: "a",
      measured_on: "2026-01-01",
      created_at: "2026-01-01T08:00:00.000Z",
      weight_kg: 80,
    });
    const b = entry({
      id: "b",
      measured_on: "2026-01-08",
      created_at: "2026-01-08T08:00:00.000Z",
      weight_kg: 82,
    });

    const result = withDeltas([a, b]);

    expect(result.map((item) => item.id)).toEqual(["b", "a"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "up", difference: 2 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↑ 2.0");
    }
    expect(result[1]?.deltas).toBeNull();
  });

  it("shows a decrease of 1 kg on C after the oldest row is removed", () => {
    const b = entry({
      id: "b",
      measured_on: "2026-01-08",
      created_at: "2026-01-08T08:00:00.000Z",
      weight_kg: 82,
    });
    const c = entry({
      id: "c",
      measured_on: "2026-01-15",
      created_at: "2026-01-15T08:00:00.000Z",
      weight_kg: 81,
    });

    const result = withDeltas([b, c]);

    expect(result.map((item) => item.id)).toEqual(["c", "b"]);
    expect(result[0]?.deltas?.weight_kg).toEqual({ direction: "down", difference: 1 });
    const latestDeltas = result[0]?.deltas;
    if (latestDeltas) {
      expect(formatDelta(latestDeltas.weight_kg)).toBe("↓ 1.0");
    }
    expect(result[1]?.deltas).toBeNull();
  });
});
