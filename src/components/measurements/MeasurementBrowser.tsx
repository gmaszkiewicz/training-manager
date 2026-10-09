import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatDelta } from "@/lib/measurement-deltas";
import { measurementFields, toMeasuredOnLocalValue } from "@/lib/measurement-input";
import {
  dayStorageKey,
  defaultPageSize,
  filterByMonth,
  journalMonth,
  measurementMonth,
  pageSizeStorageKey,
  pageSizes,
  pageSlice,
  parsePageSize,
  utcToday,
  viewOf,
  type PageSize,
} from "@/lib/measurement-page";
import { cn } from "@/lib/utils";
import type { FieldDelta, MeasurementWithDeltas } from "@/types";

interface Props {
  entries: MeasurementWithDeltas[];
  readOnly: boolean;
  editingId?: string | null;
  confirmingId?: string | null;
  accountUserId?: string | null;
  subjectTraineeId?: string | null;
  idPrefix?: string;
  today?: string;
  dates?: string[];
  page?: number;
  pageCount?: number;
  pageSize?: PageSize;
  month?: string;
}

interface PageQuery {
  month: string;
  page: number;
  size: PageSize;
  focusId: string | null;
  traineeId: string | null;
}

interface MeasurementPageBody {
  dates: string[];
  month: string;
  page: number;
  pageSize: PageSize;
  pageCount: number;
  entries: MeasurementWithDeltas[];
}

const textActionClassName = "text-primary focus-visible:ring-ring hover:underline focus-visible:ring-2";

const pagerButtonClassName = cn(
  textActionClassName,
  "disabled:pointer-events-none disabled:no-underline disabled:opacity-50",
);

const selectClassName =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-2 md:text-sm";

function namedId(id: string | null): string | null {
  if (id === null || id === "") {
    return null;
  }
  return id;
}

function formatMeasurement(value: number): string {
  return value.toFixed(1);
}

function measuredOnDisplay(value: string): { text: string; dateTime: string } {
  const local = toMeasuredOnLocalValue(value);
  return { text: local.replace("T", " "), dateTime: `${local}:00` };
}

function accessibleValue(label: string, value: number, unit: string): string {
  return `${label} ${formatMeasurement(value)} ${unit}`;
}

function accessibleDelta(label: string, unit: string, delta: FieldDelta): string {
  const direction = delta.direction === "none" ? "unchanged" : delta.direction;
  return `${label} ${direction} ${delta.difference.toFixed(1)} ${unit}`;
}

function measurementEditHref(id: string): string {
  return `/measurements?edit=${encodeURIComponent(id)}`;
}

function measurementDeleteHref(id: string, editingId: string | null): string {
  const encodedId = encodeURIComponent(id);
  if (editingId === null) {
    return `/measurements?delete=${encodedId}`;
  }
  return `/measurements?delete=${encodedId}&edit=${encodeURIComponent(editingId)}`;
}

function measurementCancelHref(editingId: string | null): string {
  if (editingId === null) {
    return "/measurements";
  }
  return `/measurements?edit=${encodeURIComponent(editingId)}`;
}

function pageCountOf(length: number, pageSize: PageSize): number {
  if (length === 0) {
    return 1;
  }
  return Math.ceil(length / pageSize);
}

function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page)) {
    return 1;
  }
  const whole = Math.floor(page);
  if (whole < 1) {
    return 1;
  }
  if (whole > pageCount) {
    return pageCount;
  }
  return whole;
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the controls still update on screen.
  }
}

function writeCookie(name: string, value: string): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // The document request then keeps the default month and page size.
  }
}

function writePreference(key: string, value: string): void {
  writeStored(key, value);
  writeCookie(key, value);
}

function isPageSize(value: unknown): value is PageSize {
  return value === 5 || value === 10 || value === 15;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function monthOfFocused(rows: readonly { id: string; measured_on: string }[], focusedId: string | null): string | null {
  if (focusedId === null) {
    return null;
  }
  const focused = rows.find((entry) => entry.id === focusedId);
  if (!focused) {
    return null;
  }
  return measurementMonth(focused.measured_on);
}

function readMeasurementPageBody(value: unknown): MeasurementPageBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const body = value as Record<string, unknown>;
  if (!isStringArray(body.dates) || typeof body.month !== "string") {
    return null;
  }
  if (typeof body.page !== "number" || !Number.isInteger(body.page) || body.page < 1) {
    return null;
  }
  if (typeof body.pageCount !== "number" || !Number.isInteger(body.pageCount) || body.pageCount < 1) {
    return null;
  }
  if (!isPageSize(body.pageSize) || !Array.isArray(body.entries)) {
    return null;
  }
  return {
    dates: body.dates,
    month: body.month,
    page: body.page,
    pageSize: body.pageSize,
    pageCount: body.pageCount,
    entries: body.entries as MeasurementWithDeltas[],
  };
}

function measurementReadUrl(query: PageQuery): string {
  const params = new URLSearchParams();
  params.set("month", query.month);
  params.set("page", String(query.page));
  params.set("size", String(query.size));
  if (query.focusId !== null) {
    params.set("focus", query.focusId);
  }
  if (query.traineeId !== null) {
    params.set("trainee", query.traineeId);
  }
  return `/api/measurements?${params.toString()}`;
}

async function fetchMeasurementPage(query: PageQuery): Promise<MeasurementPageBody | null> {
  try {
    const response = await fetch(measurementReadUrl(query), { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return readMeasurementPageBody(payload);
  } catch {
    return null;
  }
}

export default function MeasurementBrowser({
  entries,
  readOnly,
  editingId = null,
  confirmingId = null,
  accountUserId = null,
  subjectTraineeId = null,
  idPrefix = "",
  today,
  dates: datesProp,
  page: pageProp,
  pageCount: pageCountProp,
  pageSize: pageSizeProp,
  month: monthProp,
}: Props) {
  const todayValue = today ?? utcToday(new Date());
  const serverMonth = journalMonth(monthProp ?? null);
  const accountId = namedId(accountUserId);
  const subjectId = namedId(subjectTraineeId);
  const openEditingId = namedId(editingId);
  const openConfirmingId = namedId(confirmingId);
  const focusedEntryId = openConfirmingId ?? openEditingId;
  const paged = Array.isArray(datesProp) && typeof pageProp === "number" && typeof pageCountProp === "number";
  const focusedMonth = monthOfFocused(entries, focusedEntryId);
  const localInitial = paged
    ? null
    : viewOf({
        entries,
        today: todayValue,
        pageSize: defaultPageSize,
        focusedEntryId,
        savedDay: null,
      });
  const [pageSize, setPageSize] = useState<PageSize>(isPageSize(pageSizeProp) ? pageSizeProp : defaultPageSize);
  const [day, setDay] = useState(localInitial?.day ?? serverMonth ?? focusedMonth ?? measurementMonth(todayValue));
  const [page, setPage] = useState(localInitial?.page ?? pageProp ?? 1);
  const [remoteDates, setRemoteDates] = useState<string[]>(datesProp ?? []);
  const [remotePageCount, setRemotePageCount] = useState(pageCountProp ?? 1);
  const [remoteEntries, setRemoteEntries] = useState<MeasurementWithDeltas[]>(entries);
  const requestSerial = useRef(0);

  const loadPage = useCallback((query: PageQuery): void => {
    const serial = ++requestSerial.current;
    void fetchMeasurementPage(query).then((body) => {
      if (body === null || serial !== requestSerial.current) {
        return;
      }
      setRemoteDates(body.dates);
      setDay(body.month);
      setPage(body.page);
      setPageSize(body.pageSize);
      setRemotePageCount(body.pageCount);
      setRemoteEntries(body.entries);
    });
  }, []);

  // The document request already applied the preference cookie. Storage is copied onto that cookie after hydration, and a page is requested only when the cookie was missing.
  /* eslint-disable react-hooks/set-state-in-effect -- storage is applied after the hydration render */
  useEffect(() => {
    if (accountId === null) {
      return;
    }
    const storedSize = parsePageSize(readStored(pageSizeStorageKey(accountId)));
    writeCookie(pageSizeStorageKey(accountId), String(storedSize));
    const storedDay = subjectId === null ? null : readStored(dayStorageKey(accountId, subjectId));
    if (subjectId !== null && storedDay !== null) {
      writeCookie(dayStorageKey(accountId, subjectId), storedDay);
    }
    if (!paged) {
      const next = viewOf({
        entries,
        today: todayValue,
        pageSize: storedSize,
        focusedEntryId,
        savedDay: storedDay,
      });
      setPageSize(storedSize);
      setDay(next.day);
      setPage(next.page);
      return;
    }

    const serverSize = isPageSize(pageSizeProp) ? pageSizeProp : defaultPageSize;
    const traineeId = readOnly && subjectId !== null ? subjectId : null;
    const currentMonth = focusedMonth ?? serverMonth ?? measurementMonth(todayValue);
    if (focusedEntryId !== null) {
      if (storedSize === serverSize) {
        return;
      }
      loadPage({
        month: currentMonth,
        page: 1,
        size: storedSize,
        focusId: focusedEntryId,
        traineeId,
      });
      return;
    }

    const storedMonth = storedDay === null ? null : measurementMonth(storedDay);
    const savedMonth = storedMonth !== null && datesProp.includes(storedMonth) ? storedMonth : null;
    const sizeDiffers = storedSize !== serverSize;
    const monthDiffers = savedMonth !== null && savedMonth !== currentMonth;
    if (!sizeDiffers && !monthDiffers) {
      return;
    }
    loadPage({
      month: savedMonth ?? currentMonth,
      page: 1,
      size: storedSize,
      focusId: null,
      traineeId,
    });
  }, [
    accountId,
    subjectId,
    entries,
    todayValue,
    focusedEntryId,
    focusedMonth,
    paged,
    pageSizeProp,
    datesProp,
    readOnly,
    loadPage,
    serverMonth,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const monthRows = filterByMonth(entries, day);
  const localPageCount = pageCountOf(monthRows.length, pageSize);
  const localPage = clampPage(page, localPageCount);
  const dates = paged
    ? remoteDates
    : viewOf({
        entries,
        today: todayValue,
        pageSize,
        focusedEntryId: null,
        savedDay: null,
      }).dates;
  const pageCount = paged ? remotePageCount : localPageCount;
  const currentPage = paged ? page : localPage;
  const visibleEntries = paged ? remoteEntries : pageSlice(monthRows, localPage, pageSize);
  const showPager = paged ? pageCount > 1 : monthRows.length > pageSize;
  const noMeasurementsYet = paged
    ? remoteEntries.length === 0 && remotePageCount === 1 && remoteDates.length <= 1
    : entries.length === 0;
  const monthIsEmpty = paged ? remoteEntries.length === 0 : monthRows.length === 0;
  const dayId = `${idPrefix}measurement-day`;
  const cancelHref = measurementCancelHref(openEditingId);

  function traineeForRead(): string | null {
    if (!readOnly || subjectId === null) {
      return null;
    }
    return subjectId;
  }

  function onDayChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextDay = event.target.value;
    if (accountId !== null && subjectId !== null) {
      writePreference(dayStorageKey(accountId, subjectId), nextDay);
    }
    if (!paged) {
      setDay(nextDay);
      setPage(1);
      return;
    }
    const keepFocus = focusedEntryId !== null && focusedMonth === nextDay;
    loadPage({
      month: nextDay,
      page: 1,
      size: pageSize,
      focusId: keepFocus ? focusedEntryId : null,
      traineeId: traineeForRead(),
    });
  }

  function choosePageSize(nextSize: PageSize) {
    if (accountId !== null) {
      writePreference(pageSizeStorageKey(accountId), String(nextSize));
    }
    if (!paged) {
      const focusedStillOnDay = focusedEntryId !== null && monthRows.some((entry) => entry.id === focusedEntryId);
      const next = viewOf({
        entries,
        today: todayValue,
        pageSize: nextSize,
        focusedEntryId: focusedStillOnDay ? focusedEntryId : null,
        savedDay: day,
      });
      setPageSize(nextSize);
      setPage(next.page);
      return;
    }
    const keepFocus = focusedEntryId !== null && focusedMonth !== null && focusedMonth === day;
    loadPage({
      month: day,
      page: 1,
      size: nextSize,
      focusId: keepFocus ? focusedEntryId : null,
      traineeId: traineeForRead(),
    });
  }

  function showPage(nextPage: number) {
    if (!paged) {
      setPage(nextPage);
      return;
    }
    loadPage({
      month: day,
      page: nextPage,
      size: pageSize,
      focusId: null,
      traineeId: traineeForRead(),
    });
  }

  return (
    <div className="w-full">
      <div className="mt-6 flex w-full flex-wrap items-center gap-4">
        <div className="w-40 shrink-0">
          <select id={dayId} aria-label="Month" className={selectClassName} value={day} onChange={onDayChange}>
            {dates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto shrink-0">
          <div className="flex gap-2" role="group" aria-label="Entries per page">
            {pageSizes.map((size) => (
              <Button
                key={size}
                type="button"
                variant={pageSize === size ? "default" : "outline"}
                className="min-w-9 px-2"
                aria-pressed={pageSize === size}
                onClick={() => {
                  choosePageSize(size);
                }}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      </div>
      {noMeasurementsYet ? (
        <p className="text-muted-foreground mt-6 text-sm">No measurements yet</p>
      ) : monthIsEmpty ? (
        <p className="text-muted-foreground mt-6 text-sm">No measurements in this month</p>
      ) : (
        <>
          <ul className="mt-6 space-y-4 text-left">
            {visibleEntries.map((entry) => {
              const display = measuredOnDisplay(entry.measured_on);
              return (
                <li
                  key={entry.id}
                  className="bg-muted text-card-foreground border-border rounded-lg border p-4 text-sm"
                >
                  <div className="flex flex-nowrap items-start gap-2">
                    <div className="w-56 max-w-56 min-w-56 shrink-0">
                      <div className="text-muted-foreground mb-1">Date and time</div>
                      <time dateTime={display.dateTime} className="text-card-foreground font-semibold">
                        {display.text}
                      </time>
                      {readOnly ? null : (
                        <a
                          href={measurementEditHref(entry.id)}
                          aria-label={`Edit measurement from ${display.text}`}
                          className={cn("mt-1 block w-fit whitespace-nowrap", textActionClassName)}
                        >
                          Edit
                        </a>
                      )}
                      {readOnly || openConfirmingId === entry.id ? null : (
                        <a
                          href={measurementDeleteHref(entry.id, openEditingId)}
                          aria-label={`Delete measurement from ${display.text}`}
                          className={cn("mt-1 block w-fit whitespace-nowrap", textActionClassName)}
                        >
                          Delete
                        </a>
                      )}
                    </div>
                    {measurementFields.map((field) => (
                      <div key={field.field} className="w-28 max-w-28 min-w-28 shrink-0">
                        <div className="text-muted-foreground mb-1">
                          {field.label} {field.unit}
                        </div>
                        <div
                          className="border-input flex h-9 items-center rounded-md border px-3 whitespace-nowrap"
                          aria-label={accessibleValue(field.label, entry[field.field], field.unit)}
                        >
                          {formatMeasurement(entry[field.field])}
                        </div>
                        {entry.deltas ? (
                          <p
                            className="text-card-foreground mt-1 text-base font-semibold"
                            aria-label={accessibleDelta(field.label, field.unit, entry.deltas[field.field])}
                          >
                            {formatDelta(entry.deltas[field.field])}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {!readOnly && openConfirmingId === entry.id ? (
                    <form
                      method="POST"
                      action={`/api/measurements/${encodeURIComponent(entry.id)}/delete`}
                      className="mt-3 flex w-0 min-w-full flex-wrap items-center gap-4"
                    >
                      <p>Delete measurement from {display.text}?</p>
                      {openEditingId !== null ? <input type="hidden" name="edit" value={openEditingId} /> : null}
                      <Button type="submit">Delete</Button>
                      <a href={cancelHref} className={textActionClassName}>
                        Cancel
                      </a>
                    </form>
                  ) : null}
                  {entry.note ? (
                    <p className="text-muted-foreground mt-3 w-0 min-w-full wrap-break-word whitespace-pre-wrap">
                      {entry.note}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {showPager ? (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <button
                type="button"
                className={pagerButtonClassName}
                disabled={currentPage <= 1}
                onClick={() => {
                  showPage(currentPage - 1);
                }}
              >
                Previous
              </button>
              <p>
                Page {currentPage} of {pageCount}
              </p>
              <button
                type="button"
                className={pagerButtonClassName}
                disabled={currentPage >= pageCount}
                onClick={() => {
                  showPage(currentPage + 1);
                }}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
