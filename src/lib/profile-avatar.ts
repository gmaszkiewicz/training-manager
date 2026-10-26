export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_BUCKET = "avatars";

export const AVATAR_MIME_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type AvatarMimeType = keyof typeof AVATAR_MIME_TYPES;
export type AvatarExtension = (typeof AVATAR_MIME_TYPES)[AvatarMimeType];

export const AVATAR_MISSING_ERROR = "Choose an image to upload.";
export const AVATAR_TYPE_ERROR = "Use a PNG, JPEG or WebP image.";
export const AVATAR_LARGE_ERROR = "The image must be at most 2 MB.";
export const AVATAR_UNAVAILABLE_ERROR = "We could not save your avatar. Try again later.";
export const AVATAR_SAVED_NOTICE = "Your avatar was saved.";
export const AVATAR_REMOVED_NOTICE = "Your avatar was removed.";

export type AvatarErrorCode = "avatar-missing" | "avatar-type" | "avatar-large" | "avatar-unavailable";

const AVATAR_ERRORS: Record<AvatarErrorCode, string> = {
  "avatar-missing": AVATAR_MISSING_ERROR,
  "avatar-type": AVATAR_TYPE_ERROR,
  "avatar-large": AVATAR_LARGE_ERROR,
  "avatar-unavailable": AVATAR_UNAVAILABLE_ERROR,
};

function isAvatarMimeType(type: string): type is AvatarMimeType {
  return Object.hasOwn(AVATAR_MIME_TYPES, type);
}

function avatarError(code: Exclude<AvatarErrorCode, "avatar-unavailable">) {
  return { ok: false as const, code, error: AVATAR_ERRORS[code] };
}

/** Checks presence, size and declared type. Client-safe: the form runs it before submit. */
export function parseAvatarFile(
  file: unknown,
):
  | { ok: true; file: File; extension: AvatarExtension }
  | { ok: false; code: Exclude<AvatarErrorCode, "avatar-unavailable">; error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return avatarError("avatar-missing");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return avatarError("avatar-large");
  }
  if (!isAvatarMimeType(file.type)) {
    return avatarError("avatar-type");
  }
  return { ok: true, file, extension: AVATAR_MIME_TYPES[file.type] };
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** The image type from the file's leading bytes, or null when it is none of the accepted types. */
export function sniffAvatarType(bytes: Uint8Array): AvatarMimeType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  // "RIFF" <4-byte size> "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export function avatarPageError(code: string | null): string | null {
  if (code !== null && Object.hasOwn(AVATAR_ERRORS, code)) {
    return AVATAR_ERRORS[code as AvatarErrorCode];
  }
  return null;
}

export function avatarPageNotice(code: string | null): string | null {
  if (code === "avatar-saved") {
    return AVATAR_SAVED_NOTICE;
  }
  if (code === "avatar-removed") {
    return AVATAR_REMOVED_NOTICE;
  }
  return null;
}

export function avatarPublicUrl(supabaseUrl: string, path: string | null): string | null {
  if (path === null) {
    return null;
  }
  return `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
