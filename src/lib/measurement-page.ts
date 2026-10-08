export const pageSizes = [5, 10, 15] as const;

export type PageSize = (typeof pageSizes)[number];

export const defaultPageSize: PageSize = 10;

export function measurementMonth(measuredOn: string): string {
  return measuredOn.replace(" ", "T").slice(0, 7);
}

function formatUtcDate(year: number, month: number, day: number): string {
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return `${String(year)}-${paddedMonth}-${paddedDay}`;
}

export function utcToday(now: Date): string {
  return formatUtcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

export function parsePageSize(value: unknown): PageSize {
  if (value === "5") {
    return 5;
  }
  if (value === "10") {
    return 10;
  }
  if (value === "15") {
    return 15;
  }
  return defaultPageSize;
}

export function pageSizeStorageKey(accountUserId: string): string {
  return `tm.measurements.pageSize.${accountUserId}`;
}

export function dayStorageKey(accountUserId: string, subjectTraineeId: string): string {
  return `tm.measurements.day.${accountUserId}.${subjectTraineeId}`;
}

export function filterByMonth<T extends { measured_on: string }>(entries: readonly T[], month: string): T[] {
  return entries.filter((entry) => measurementMonth(entry.measured_on) === month);
}

function pageCount(length: number, pageSize: PageSize): number {
  if (length === 0) {
    return 1;
  }
  return Math.ceil(length / pageSize);
}

function resolvePage(page: number, pages: number): number {
  if (!Number.isFinite(page)) {
    return 1;
  }
  const whole = Math.floor(page);
  if (whole < 1) {
    return 1;
  }
  if (whole > pages) {
    return pages;
  }
  return whole;
}

export function pageSlice<T>(entries: readonly T[], page: number, pageSize: PageSize): T[] {
  const resolved = resolvePage(page, pageCount(entries.length, pageSize));
  const start = (resolved - 1) * pageSize;
  return entries.slice(start, start + pageSize);
}

function compareNewestFirst(left: string, right: string): number {
  if (left < right) {
    return 1;
  }
  if (left > right) {
    return -1;
  }
  return 0;
}

function datesNewestFirst(entries: readonly { measured_on: string }[], today: string): string[] {
  const months: string[] = [];
  for (const entry of entries) {
    const month = measurementMonth(entry.measured_on);
    if (!months.includes(month)) {
      months.push(month);
    }
  }
  const currentMonth = measurementMonth(today);
  if (!months.includes(currentMonth)) {
    months.push(currentMonth);
  }
  months.sort(compareNewestFirst);
  return months;
}

function savedMonth(savedDay: string | null, dates: string[]): string | null {
  if (savedDay === null) {
    return null;
  }
  const month = measurementMonth(savedDay);
  return dates.includes(month) ? month : null;
}

export function viewOf({
  entries,
  today,
  pageSize,
  focusedEntryId,
  savedDay,
}: {
  entries: { id: string; measured_on: string }[];
  today: string;
  pageSize: PageSize;
  focusedEntryId: string | null;
  savedDay: string | null;
}): { dates: string[]; day: string; page: number } {
  const dates = datesNewestFirst(entries, today);
  const currentMonth = measurementMonth(today);
  if (focusedEntryId !== null) {
    const focused = entries.find((entry) => entry.id === focusedEntryId);
    if (focused) {
      const day = measurementMonth(focused.measured_on);
      const index = filterByMonth(entries, day).findIndex((entry) => entry.id === focused.id);
      const page = index < 0 ? 1 : Math.floor(index / pageSize) + 1;
      return { dates, day, page };
    }
  }

  return { dates, day: savedMonth(savedDay, dates) ?? currentMonth, page: 1 };
}
