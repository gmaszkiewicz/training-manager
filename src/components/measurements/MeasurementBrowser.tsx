import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatDelta } from "@/lib/measurement-deltas";
import { measurementFields, toMeasuredOnLocalValue } from "@/lib/measurement-input";
import {
  dayStorageKey,
  defaultPageSize,
  filterByMonth,
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

export default function MeasurementBrowser({
  entries,
  readOnly,
  editingId = null,
  confirmingId = null,
  accountUserId = null,
  subjectTraineeId = null,
  idPrefix = "",
  today,
}: Props) {
  const todayValue = today ?? utcToday(new Date());
  const accountId = namedId(accountUserId);
  const subjectId = namedId(subjectTraineeId);
  const openEditingId = namedId(editingId);
  const openConfirmingId = namedId(confirmingId);
  const focusedEntryId = openConfirmingId ?? openEditingId;
  const initialView = viewOf({
    entries,
    today: todayValue,
    pageSize: defaultPageSize,
    focusedEntryId,
    savedDay: null,
  });
  const [pageSize, setPageSize] = useState<PageSize>(defaultPageSize);
  const [day, setDay] = useState(initialView.day);
  const [page, setPage] = useState(initialView.page);

  // SSR and the hydration render stay on the default view. Browser memory is applied after that paint.
  /* eslint-disable react-hooks/set-state-in-effect -- storage is applied after the hydration render */
  useEffect(() => {
    if (accountId === null) {
      return;
    }
    const storedSize = parsePageSize(readStored(pageSizeStorageKey(accountId)));
    const storedDay = subjectId === null ? null : readStored(dayStorageKey(accountId, subjectId));
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
  }, [accountId, subjectId, entries, todayValue, focusedEntryId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dates = viewOf({
    entries,
    today: todayValue,
    pageSize,
    focusedEntryId: null,
    savedDay: null,
  }).dates;
  const dayEntries = filterByMonth(entries, day);
  const pageCount = pageCountOf(dayEntries.length, pageSize);
  const currentPage = clampPage(page, pageCount);
  const visibleEntries = pageSlice(dayEntries, currentPage, pageSize);
  const showPager = dayEntries.length > pageSize;
  const dayId = `${idPrefix}measurement-day`;
  const cancelHref = measurementCancelHref(openEditingId);

  function onDayChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextDay = event.target.value;
    setDay(nextDay);
    setPage(1);
    if (accountId !== null && subjectId !== null) {
      writeStored(dayStorageKey(accountId, subjectId), nextDay);
    }
  }

  function choosePageSize(nextSize: PageSize) {
    const focusedStillOnDay = focusedEntryId !== null && dayEntries.some((entry) => entry.id === focusedEntryId);
    const next = viewOf({
      entries,
      today: todayValue,
      pageSize: nextSize,
      focusedEntryId: focusedStillOnDay ? focusedEntryId : null,
      savedDay: day,
    });
    setPageSize(nextSize);
    setPage(next.page);
    if (accountId !== null) {
      writeStored(pageSizeStorageKey(accountId), String(nextSize));
    }
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
      {entries.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">No measurements yet</p>
      ) : dayEntries.length === 0 ? (
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
                  setPage(currentPage - 1);
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
                  setPage(currentPage + 1);
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
