export interface TrainerLink {
  traineeId: string;
  email: string;
  linkedAt: string;
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
