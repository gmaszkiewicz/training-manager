import { topbarName } from "@/lib/topbar";

export interface TrainerLink {
  traineeId: string;
  email: string;
  linkedAt: string;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * The trainee as the trainer's tile headings name them: "A. Lovelace (ada@example.com)" with both names, the one saved
 * name with the email ("Ada (ada@example.com)"), otherwise the email alone.
 */
export function traineeLabel(link: Pick<TrainerLink, "email" | "firstName" | "lastName">): string {
  const name = topbarName({ firstName: link.firstName ?? null, lastName: link.lastName ?? null, email: link.email });
  return name === link.email ? link.email : `${name} (${link.email})`;
}

/** A tile heading naming whose measurements it shows: "Weekly progression for A. Lovelace (ada@example.com)". */
export function headingFor(title: string, subject: string | null | undefined): string {
  return subject ? `${title} for ${subject}` : title;
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
  const sorted = [...links].sort((a, b) => a.email.localeCompare(b.email));

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
