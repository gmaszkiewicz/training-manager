import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** An id as a value, or `null` when it is missing or empty. */
export function namedId(id: string | null | undefined): string | null {
  if (id === null || id === undefined || id === "") {
    return null;
  }
  return id;
}
