export interface TrainerLink {
  traineeId: string;
  email: string;
  linkedAt: string;
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
