export interface TrainerLink {
  traineeId: string;
  email: string;
  linkedAt: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface TraineeNames {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * The trainee's full name: "Ada Lovelace" with both names (first name as saved), the one saved name alone, otherwise
 * the email. Differs from the Collaborations rule (`topbarName`) only when both names are saved.
 */
export function traineeName({ firstName, lastName, email }: TraineeNames): string {
  const first = firstName?.trim() ?? "";
  const last = lastName?.trim() ?? "";
  if (first !== "" && last !== "") {
    return `${first} ${last}`;
  }
  return last || first || email;
}

// Blank sorts last; otherwise case- and accent-insensitive, like the SQL fold.
function compareName(a: string | null | undefined, b: string | null | undefined): number {
  const left = a?.trim() ?? "";
  const right = b?.trim() ?? "";
  if (left === "" || right === "") {
    return (left === "" ? 1 : 0) - (right === "" ? 1 : 0);
  }
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

/** Orders trainees by last name, then first name (blank names last), then email, ignoring case and accents. */
export function compareTrainees(a: TraineeNames, b: TraineeNames): number {
  return (
    compareName(a.lastName, b.lastName) ||
    compareName(a.firstName, b.firstName) ||
    a.email.trim().localeCompare(b.email.trim(), "en", { sensitivity: "base" })
  );
}

export function preferredTraineeId(query: string | null, remembered: string | null): string | null {
  if (query !== null && query.length > 0) {
    return query;
  }
  if (remembered !== null && remembered.length > 0) {
    return remembered;
  }
  return null;
}

export function selectTrainerPreview(
  links: TrainerLink[],
  traineeId?: string | null,
): { links: TrainerLink[]; selected: TrainerLink | null } {
  const sorted = [...links].sort(compareTrainees);

  if (sorted.length === 0) {
    return { links: sorted, selected: null };
  }

  if (traineeId) {
    const matched = sorted.find((link) => link.traineeId === traineeId);
    if (matched) {
      return { links: sorted, selected: matched };
    }
  }

  let selected = sorted[0];
  for (const link of sorted.slice(1)) {
    if (link.linkedAt > selected.linkedAt) {
      selected = link;
      continue;
    }
    if (link.linkedAt === selected.linkedAt && link.traineeId < selected.traineeId) {
      selected = link;
    }
  }

  return { links: sorted, selected };
}

export function adjacentTrainerLinks(
  links: readonly TrainerLink[],
  traineeId: string,
): { previous: TrainerLink | null; next: TrainerLink | null } {
  const index = links.findIndex((link) => link.traineeId === traineeId);

  if (index === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: index > 0 ? links[index - 1] : null,
    next: index < links.length - 1 ? links[index + 1] : null,
  };
}
