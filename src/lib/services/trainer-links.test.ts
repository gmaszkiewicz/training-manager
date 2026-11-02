import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/db/database.types";
import { searchUnlinkedTrainees } from "@/lib/services/trainer-links";

function clientAnswering(answer: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(answer);
  const supabase = { rpc } as unknown as SupabaseClient<Database>;
  return { supabase, rpc };
}

describe("searchUnlinkedTrainees", () => {
  it("maps RPC rows to trainee matches, with names set or null", async () => {
    const { supabase, rpc } = clientAnswering({
      data: [
        { email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
        { email: "anon@example.com", first_name: null, last_name: null },
      ],
      error: null,
    });

    const result = await searchUnlinkedTrainees(supabase, "ada love");

    expect(rpc).toHaveBeenCalledWith("search_unlinked_trainees", { p_query: "ada love" });
    expect(result).toEqual({
      ok: true,
      trainees: [
        { email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
        { email: "anon@example.com", firstName: null, lastName: null },
      ],
    });
  });

  it("answers no trainees for a blank query without calling the RPC", async () => {
    const { supabase, rpc } = clientAnswering({ data: [], error: null });

    const result = await searchUnlinkedTrainees(supabase, "   ");

    expect(result).toEqual({ ok: true, trainees: [] });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails on a malformed payload", async () => {
    const malformed: unknown[] = [
      null,
      "ada@example.com",
      ["ada@example.com"],
      [{ email: 1, first_name: null, last_name: null }],
      [{ email: "ada@example.com", first_name: 1, last_name: null }],
      [{ email: "ada@example.com", first_name: null }],
    ];

    for (const data of malformed) {
      const { supabase } = clientAnswering({ data, error: null });
      await expect(searchUnlinkedTrainees(supabase, "ada")).resolves.toEqual({ ok: false });
    }
  });

  it("fails when the RPC answers an error or throws", async () => {
    const { supabase } = clientAnswering({ data: null, error: { message: "boom" } });
    await expect(searchUnlinkedTrainees(supabase, "ada")).resolves.toEqual({ ok: false });

    const throwing = { rpc: vi.fn().mockRejectedValue(new Error("network")) } as unknown as SupabaseClient<Database>;
    await expect(searchUnlinkedTrainees(throwing, "ada")).resolves.toEqual({ ok: false });
  });
});
