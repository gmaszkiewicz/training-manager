import type { Profile } from "@/types";

/** Narrows a raw `profiles.role` value to the app role; anything else is null. */
export function parseProfileRole(value: unknown): Profile["role"] | null {
  return value === "trainee" || value === "trainer" ? value : null;
}

export function profileRoleLabel(role: Profile["role"]): "Trainee" | "Trainer" {
  return role === "trainer" ? "Trainer" : "Trainee";
}
