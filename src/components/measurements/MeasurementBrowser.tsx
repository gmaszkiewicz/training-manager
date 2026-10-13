import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Ruler, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/journal-calendar";
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

function namedId(id: string | null): string | null {
  if (id === null || id === "") {
    return null;
  }
  return id;
}

function monthButtonLabels(months: readonly string[], current: string): string[] {
  const labels = new Set(months.map((listedMonth) => monthLabel(listedMonth)));
  labels.add(monthLabel(current));
  return [...labels];
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

function deltaArrow(delta: FieldDelta): string | null {
  if (delta.direction === "up") {
    return "↑";
  }
  if (delta.direction === "down") {
    return "↓";
  }
  return null;
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

function earlierMonth(current: string, knownMonths: readonly string[]): string | null {
  let earlier: string | null = null;
  for (const candidate of knownMonths) {
    if (candidate < current && (earlier === null || candidate > earlier)) {
      earlier = candidate;
    }
  }
  return earlier;
}

function laterMonth(current: string, knownMonths: readonly string[]): string | null {
  let later: string | null = null;
  for (const candidate of knownMonths) {
    if (candidate > current && (later === null || candidate < later)) {
      later = candidate;
    }
  }
  return later;
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
  const initialMonth = localInitial?.day ?? serverMonth ?? focusedMonth ?? measurementMonth(todayValue);
  const [pageSize, setPageSize] = useState<PageSize>(isPageSize(pageSizeProp) ? pageSizeProp : defaultPageSize);
  const [month, setMonth] = useState(initialMonth);
  const [page, setPage] = useState(localInitial?.page ?? pageProp ?? 1);
  const [remoteDates, setRemoteDates] = useState<string[]>(datesProp ?? []);
  const [remotePageCount, setRemotePageCount] = useState(pageCountProp ?? 1);
  const [remoteEntries, setRemoteEntries] = useState<MeasurementWithDeltas[]>(entries);
  const [monthListOpen, setMonthListOpen] = useState(false);
  const monthFieldRef = useRef<HTMLDivElement>(null);
  const monthListRef = useRef<HTMLDivElement>(null);
  const requestSerial = useRef(0);

  const loadPage = useCallback((query: PageQuery): void => {
    const serial = ++requestSerial.current;
    void fetchMeasurementPage(query).then((body) => {
      if (body === null || serial !== requestSerial.current) {
        return;
      }
      setRemoteDates(body.dates);
      setMonth(body.month);
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
      setMonth(next.day);
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

  const monthRows = filterByMonth(entries, month);
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
  const previousMonth = earlierMonth(month, dates);
  const nextMonth = laterMonth(month, dates);
  const monthListScrolls = dates.length > 6;

  useEffect(() => {
    if (!monthListOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMonthListOpen(false);
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || monthFieldRef.current?.contains(target)) {
        return;
      }
      setMonthListOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [monthListOpen]);

  useEffect(() => {
    if (!monthListOpen || !monthListScrolls) {
      return;
    }
    const container = monthListRef.current;
    const selected = container?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (container === null || selected === null || selected === undefined) {
      return;
    }
    const nextTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2;
    container.scrollTop = Math.max(0, nextTop);
  }, [monthListOpen, monthListScrolls, month]);
  const cancelHref = measurementCancelHref(openEditingId);

  function traineeForRead(): string | null {
    if (!readOnly || subjectId === null) {
      return null;
    }
    return subjectId;
  }

  function chooseMonth(nextMonth: string) {
    setMonthListOpen(false);
    if (nextMonth === month || !dates.includes(nextMonth)) {
      return;
    }
    if (accountId !== null && subjectId !== null) {
      writePreference(dayStorageKey(accountId, subjectId), nextMonth);
    }
    if (!paged) {
      setMonth(nextMonth);
      setPage(1);
      return;
    }
    const keepFocus = focusedEntryId !== null && focusedMonth === nextMonth;
    loadPage({
      month: nextMonth,
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
        savedDay: month,
      });
      setPageSize(nextSize);
      setPage(next.page);
      return;
    }
    const keepFocus = focusedEntryId !== null && focusedMonth !== null && focusedMonth === month;
    loadPage({
      month,
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
      month,
      page: nextPage,
      size: pageSize,
      focusId: null,
      traineeId: traineeForRead(),
    });
  }

  return (
    <div className="w-full">
      <div className="mt-6 flex w-full flex-wrap items-start gap-4">
        <div ref={monthFieldRef} className="relative z-10">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Month">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous month"
              disabled={previousMonth === null}
              onClick={() => {
                if (previousMonth !== null) {
                  chooseMonth(previousMonth);
                }
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="grid"
              aria-expanded={monthListOpen}
              aria-label={monthLabel(month)}
              onClick={() => {
                setMonthListOpen((open) => !open);
              }}
            >
              <span aria-hidden="true" className="invisible col-start-1 row-start-1 grid">
                {monthButtonLabels(dates, month).map((label) => (
                  <span key={label} className="col-start-1 row-start-1 flex items-center gap-2">
                    <ChevronDown className="shrink-0" aria-hidden="true" />
                    <span className="text-center">{label}</span>
                    <ChevronDown className="shrink-0" aria-hidden="true" />
                  </span>
                ))}
              </span>
              <span className="col-start-1 row-start-1 flex items-center gap-2">
                <ChevronDown className="invisible shrink-0" aria-hidden="true" />
                <span className="flex-1 text-center">{monthLabel(month)}</span>
                <ChevronDown className={cn("shrink-0", monthListOpen && "rotate-180")} aria-hidden="true" />
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next month"
              disabled={nextMonth === null}
              onClick={() => {
                if (nextMonth !== null) {
                  chooseMonth(nextMonth);
                }
              }}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          {monthListOpen ? (
            <div
              ref={monthListRef}
              className={cn(
                "bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md",
                monthListScrolls && "max-h-68 overflow-x-hidden overflow-y-auto",
              )}
            >
              {dates.map((listedMonth) => {
                const pressed = listedMonth === month;
                return (
                  <Button
                    key={listedMonth}
                    type="button"
                    variant={pressed ? "default" : "outline"}
                    aria-pressed={pressed}
                    onClick={() => {
                      chooseMonth(listedMonth);
                    }}
                  >
                    {monthLabel(listedMonth)}
                  </Button>
                );
              })}
            </div>
          ) : null}
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
                          className="border-input relative flex h-9 items-center justify-center rounded-md border px-3 whitespace-nowrap"
                          aria-label={accessibleValue(field.label, entry[field.field], field.unit)}
                        >
                          <span className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2">
                            {field.unit === "kg" ? (
                              <Scale aria-hidden="true" className="size-4" />
                            ) : (
                              <Ruler aria-hidden="true" className="size-4" />
                            )}
                          </span>
                          {formatMeasurement(entry[field.field])}
                        </div>
                        <p
                          className="text-card-foreground relative mt-1 flex min-h-lh items-center justify-center border border-transparent text-base font-semibold"
                          aria-hidden={entry.deltas ? undefined : true}
                          aria-label={
                            entry.deltas
                              ? accessibleDelta(field.label, field.unit, entry.deltas[field.field])
                              : undefined
                          }
                        >
                          {entry.deltas ? (
                            <>
                              {deltaArrow(entry.deltas[field.field]) ? (
                                <span
                                  aria-hidden
                                  className="absolute top-1/2 left-3 flex size-4 -translate-y-1/2 items-center justify-center"
                                >
                                  {deltaArrow(entry.deltas[field.field])}
                                </span>
                              ) : null}
                              <span aria-hidden>{entry.deltas[field.field].difference.toFixed(1)}</span>
                            </>
                          ) : (
                            "\u00a0"
                          )}
                        </p>
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
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-sm">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => {
                  showPage(currentPage - 1);
                }}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <p>
                Page {currentPage} of {pageCount}
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={currentPage >= pageCount}
                onClick={() => {
                  showPage(currentPage + 1);
                }}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
