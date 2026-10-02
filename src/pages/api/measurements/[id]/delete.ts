import type { APIRoute } from "astro";

import { deleteMeasurement } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formEditId(form: FormData): string | undefined {
  const edit = form.get("edit");
  if (typeof edit === "string" && UUID_PATTERN.test(edit)) {
    return edit;
  }
  return undefined;
}

function deleteFailed(context: Parameters<APIRoute>[0], measurementId: string, message: string, editId?: string) {
  const error = encodeURIComponent(message);
  const edit = editId === undefined ? "" : `&edit=${encodeURIComponent(editId)}`;
  return context.redirect(`/measurements?delete=${encodeURIComponent(measurementId)}${edit}&error=${error}`);
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const measurementId = context.params.id ?? "";

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    const form = await context.request.formData();
    return deleteFailed(context, measurementId, "Supabase is not configured", formEditId(form));
  }

  if (!UUID_PATTERN.test(measurementId)) {
    return context.redirect(`/measurements?error=${encodeURIComponent("Could not delete the measurement")}`);
  }

  const form = await context.request.formData();
  const editId = formEditId(form);
  const deleted = await deleteMeasurement(supabase, user.id, measurementId);
  if (!deleted.ok) {
    return deleteFailed(context, measurementId, "Could not delete the measurement", editId);
  }

  if (editId !== undefined && editId.toLowerCase() !== measurementId.toLowerCase()) {
    return context.redirect(`/measurements?edit=${encodeURIComponent(editId)}`);
  }

  return context.redirect("/measurements");
};
