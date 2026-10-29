import type { SessionUser } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Maps verified JWT claims to the session user, or `null` when they carry no usable identity. */
export function sessionUserFromClaims(claims: unknown): SessionUser | null {
  if (!isRecord(claims)) return null;

  const { sub, email, user_metadata: userMetadata } = claims;
  if (typeof sub !== "string" || sub === "") return null;

  const user: SessionUser = {
    id: sub,
    user_metadata: isRecord(userMetadata) ? userMetadata : {},
  };
  if (typeof email === "string") user.email = email;
  return user;
}
