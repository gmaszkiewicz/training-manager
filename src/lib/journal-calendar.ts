const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function calendarDate(value: string): string {
  return value.replace(" ", "T").slice(0, 10);
}

function calendarMonth(value: string): string {
  return calendarDate(value).slice(0, 7);
}

function formatDay(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const paddedMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const paddedDay = String(date.getUTCDate()).padStart(2, "0");
  return `${String(date.getUTCFullYear())}-${paddedMonth}-${paddedDay}`;
}

function mondayOf(day: string): string {
  const date = calendarDate(day);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const dayOfMonth = Number(date.slice(8, 10));
  const weekday = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return formatDay(year, month, dayOfMonth - daysSinceMonday);
}

function addDays(day: string, delta: number): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const dayOfMonth = Number(day.slice(8, 10));
  return formatDay(year, month, dayOfMonth + delta);
}

export function weekContaining(day: string): string[] {
  const monday = mondayOf(day);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function monthGrid(month: string): string[] {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const first = formatDay(year, monthNumber, 1);
  const last = formatDay(year, monthNumber + 1, 0);
  const end = addDays(mondayOf(last), 6);
  const cells: string[] = [];
  let cursor = mondayOf(first);
  while (cursor <= end) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return cells;
}

export function monthLabel(month: string): string {
  const year = month.slice(0, 4);
  const monthNumber = Number(month.slice(5, 7));
  return `${ENGLISH_MONTHS[monthNumber - 1]} ${year}`;
}

export function widestMonthLabel(month: string): string {
  return `September ${month.slice(0, 4)}`;
}

export function openingDay(month: string, today: string, newestMeasuredOn: string | null): string {
  if (calendarMonth(today) === month) {
    return today;
  }
  if (newestMeasuredOn !== null) {
    return calendarDate(newestMeasuredOn);
  }
  return `${month}-01`;
}

export function listMonthChange(currentMonth: string, day: string, knownMonths: readonly string[]): string | null {
  const month = calendarMonth(day);
  if (month === currentMonth || !knownMonths.includes(month)) {
    return null;
  }
  return month;
}
