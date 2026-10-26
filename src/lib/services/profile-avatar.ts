import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { AVATAR_BUCKET, type AvatarExtension } from "@/lib/profile-avatar";

export async function readAvatarPath(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ path: string | null } | null> {
  try {
    const { data, error } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();

    if (error || !data) {
      return null;
    }

    return { path: data.avatar_path };
  } catch {
    return null;
  }
}

async function writeAvatarPath(
  supabase: SupabaseClient<Database>,
  userId: string,
  path: string | null,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId).select("id");

    return !error && data.length === 1;
  } catch {
    return false;
  }
}

// A failed delete leaves an orphaned file but never a broken avatar, so callers ignore the result.
async function removeObject(supabase: SupabaseClient<Database>, path: string): Promise<void> {
  try {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  } catch {
    // Ignored on purpose.
  }
}

/** Uploads a new file, points the profile at it, then deletes the previous file. */
export async function replaceAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
  extension: AvatarExtension,
): Promise<{ ok: true } | { ok: false }> {
  const previous = await readAvatarPath(supabase, userId);
  if (!previous) {
    return { ok: false };
  }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  try {
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      return { ok: false };
    }
  } catch {
    return { ok: false };
  }

  if (!(await writeAvatarPath(supabase, userId, path))) {
    await removeObject(supabase, path);
    return { ok: false };
  }

  if (previous.path !== null && previous.path !== path) {
    await removeObject(supabase, previous.path);
  }

  return { ok: true };
}

/** Clears the profile's avatar first, then deletes the file. */
export async function removeAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true } | { ok: false }> {
  const current = await readAvatarPath(supabase, userId);
  if (!current) {
    return { ok: false };
  }
  if (current.path === null) {
    return { ok: true };
  }

  if (!(await writeAvatarPath(supabase, userId, null))) {
    return { ok: false };
  }

  await removeObject(supabase, current.path);
  return { ok: true };
}
