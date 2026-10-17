import type { APIRoute } from "astro";

import { readProfileRole } from "@/lib/services/ensure-profile";
import { unlinkTrainee } from "@/lib/services/trainer-links";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unlinkFailed(context: Parameters<APIRoute>[0]) {
  return context.redirect("/profile?view=unlink&error=unlink-failed");
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const traineeId = context.params.traineeId ?? "";

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return unlinkFailed(context);
  }

  if (!UUID_PATTERN.test(traineeId)) {
    return unlinkFailed(context);
  }

  const role = await readProfileRole(supabase, user.id);
  if (role !== "trainer") {
    return unlinkFailed(context);
  }

  const unlinked = await unlinkTrainee(supabase, traineeId);
  if (!unlinked.ok) {
    return unlinkFailed(context);
  }

  return context.redirect("/profile?view=unlink");
};
