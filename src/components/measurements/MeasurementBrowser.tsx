import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Ruler,
  Scale,
  StickyNote,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { monthLabel, widestMonthLabel } from "@/lib/journal-calendar";
import { measurementFields, toMeasuredOnLocalValue } from "@/lib/measurement-input";
import {
  dayStorageKey,
  defaultPageSize,
  filterByMonth,
  journalMonth,
  journalPageStorageKey,
  measurementMonth,
  pageSizeStorageKey,
  parseJournalPage,
  pageSizes,
  pageSlice,
  parsePageSize,
  utcToday,
  viewOf,
  type PageSize,
} from "@/lib/measurement-page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { FieldDelta, MeasurementField, MeasurementWithDeltas } from "@/types";

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

const textActionClassName = "text-primary focus-visible:ring-ring underline focus-visible:ring-2";

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

function deltaCaption(delta: FieldDelta | undefined): { text: string; muted: boolean } {
  if (delta === undefined) {
    return { text: "\u2014", muted: true };
  }
  if (delta.direction === "none") {
    return { text: "0.0", muted: true };
  }
  const arrow = deltaArrow(delta);
  return {
    text: arrow === null ? delta.difference.toFixed(1) : `${arrow} ${delta.difference.toFixed(1)}`,
    muted: false,
  };
}

const metricColumnClass = "w-measurement-saved-metric measurement-row:w-measurement-metric";
const dateColumnClass = "w-28 measurement-row:w-measurement-date";
const measurementHeaderIcon: Record<MeasurementField, LucideIcon> = {
  weight_kg: Scale,
  chest_cm: Ruler,
  waist_cm: Ruler,
  arms_cm: Ruler,
  thigh_cm: Ruler,
  calf_cm: Ruler,
  hips_cm: Ruler,
  navel_cm: Ruler,
};
const stickyHeaderClass = "sticky z-10 bg-muted";
const stickyBodyClass =
  "sticky z-10 bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted group-data-[state=selected]:group-hover:bg-muted";

function MetricHeader({ field }: { field: (typeof measurementFields)[number] }) {
  const Icon = measurementHeaderIcon[field.field];
  return (
    <span className="flex flex-col items-center gap-1">
      <Icon aria-hidden="true" className="size-4" />
      <span>
        {field.label} {field.unit}
      </span>
    </span>
  );
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function DeleteConfirmToast({
  entry,
  editingId,
  cancelHref,
}: {
  entry: MeasurementWithDeltas;
  editingId: string | null;
  cancelHref: string;
}) {
  const display = measuredOnDisplay(entry.measured_on);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!onClient) {
      return;
    }
    deleteRef.current?.focus();
  }, [entry.id, onClient]);

  if (!onClient) {
    return null;
  }

  return createPortal(
    <div className="fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100%-2rem))]">
      <form
        method="POST"
        action={`/api/measurements/${encodeURIComponent(entry.id)}/delete`}
        role="alertdialog"
        aria-labelledby="delete-measurement-toast"
        className="bg-background text-foreground border-border flex flex-col gap-3 rounded-lg border p-4 shadow-lg"
      >
        <p id="delete-measurement-toast" className="text-sm">
          Delete measurement from {display.text}?
        </p>
        <input type="hidden" name="measured_on" value={toMeasuredOnLocalValue(entry.measured_on)} />
        <div className="flex items-center gap-4">
          <Button ref={deleteRef} type="submit" size="sm">
            Delete
          </Button>
          <a href={cancelHref} className={textActionClassName}>
            Cancel
          </a>
        </div>
        {editingId !== null ? <input type="hidden" name="edit" value={editingId} /> : null}
      </form>
    </div>,
    document.body,
  );
}

function NoteDialog({ entry, onClose }: { entry: MeasurementWithDeltas; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const current = dialogRef.current;
    if (!onClient || current === null) {
      return;
    }
    const dialog: HTMLDialogElement = current;
    if (!dialog.open) {
      dialog.show();
    }
    const closeButton = dialog.querySelector("button");
    closeButton?.focus();
    function onDialogClose() {
      onCloseRef.current();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || dialog.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest("[data-note-id]") !== null) {
        return;
      }
      event.preventDefault();
      dialog.close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dialog.close();
      }
    }
    dialog.addEventListener("close", onDialogClose);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("close", onDialogClose);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [onClient]);

  if (!onClient) {
    return null;
  }

  const display = measuredOnDisplay(entry.measured_on);
  const titleId = `measurement-note-${entry.id}`;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="bg-background text-foreground border-border fixed inset-0 z-50 m-auto hidden h-fit max-h-[min(32rem,calc(100%-2rem))] w-[min(24rem,calc(100%-2rem))] max-w-none flex-col gap-3 rounded-lg border p-4 shadow-lg backdrop:bg-transparent open:flex"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id={titleId} className="text-sm font-semibold">
            Note
          </p>
          <p className="text-muted-foreground text-xs">{display.text}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={`Close note from ${display.text}`}
          onClick={() => {
            dialogRef.current?.close();
          }}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <p className="min-h-0 overflow-y-auto text-sm wrap-break-word whitespace-pre-wrap">{entry.note}</p>
    </dialog>,
    document.body,
  );
}

function NoteOpenButton({
  noteId,
  label,
  expanded,
  className,
  onClick,
}: {
  noteId: string;
  label: string;
  expanded: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-12", className)}
      aria-label={label}
      aria-expanded={expanded}
      data-note-id={noteId}
      onClick={onClick}
    >
      <StickyNote className="size-4" aria-hidden="true" />
    </Button>
  );
}

function NoteIconSlot({
  noteId,
  hasNote,
  label,
  expanded,
  className,
  onClick,
}: {
  noteId: string;
  hasNote: boolean;
  label: string;
  expanded: boolean;
  className?: string;
  onClick: () => void;
}) {
  if (!hasNote) {
    return (
      <span
        className={cn(
          "text-muted-foreground relative inline-flex size-12 shrink-0 items-center justify-center",
          className,
        )}
        aria-hidden="true"
      >
        <StickyNote className="size-4" />
        <span className="absolute top-1/2 left-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
      </span>
    );
  }

  return <NoteOpenButton noteId={noteId} label={label} expanded={expanded} className={className} onClick={onClick} />;
}

function singleLineNote(note: string | null): string | null {
  if (note === null || note === "" || /[\r\n]/.test(note)) {
    return null;
  }
  return note;
}

function NoteRowCell({
  note,
  noteId,
  label,
  expanded,
  onClick,
}: {
  note: string | null;
  noteId: string;
  label: string;
  expanded: boolean;
  onClick: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const singleLine = singleLineNote(note);
  const [showText, setShowText] = useState(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const probe = probeRef.current;
    if (box === null || probe === null || singleLine === null) {
      setShowText(false);
      return;
    }

    const update = () => {
      const style = window.getComputedStyle(box);
      const available = box.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      const next = probe.scrollWidth <= available;
      setShowText((current) => (current === next ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, [singleLine]);

  return (
    <div ref={boxRef} className="relative flex h-full min-h-12 w-full items-center justify-center px-2">
      {singleLine === null ? null : (
        <span ref={probeRef} className="invisible absolute text-sm whitespace-nowrap" aria-hidden="true">
          {singleLine}
        </span>
      )}
      {showText && singleLine !== null ? (
        <Button
          type="button"
          variant="ghost"
          className="h-auto px-0 font-normal"
          aria-expanded={expanded}
          data-note-id={noteId}
          onClick={onClick}
        >
          {singleLine}
        </Button>
      ) : (
        <NoteIconSlot
          noteId={noteId}
          hasNote={note !== null && note !== ""}
          label={label}
          expanded={expanded}
          className="size-12"
          onClick={onClick}
        />
      )}
    </div>
  );
}

function RowActions({
  displayText,
  editHref,
  deleteHref,
}: {
  displayText: string;
  editHref: string;
  deleteHref: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-12"
          aria-label={`Actions for measurement from ${displayText}`}
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={editHref}>Edit</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={deleteHref}>Delete</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MeasurementEntry({
  entry,
  readOnly,
  openEditingId,
  noteOpen,
  selected,
  isLast,
  onOpenNote,
  onSelectedChange,
}: {
  entry: MeasurementWithDeltas;
  readOnly: boolean;
  openEditingId: string | null;
  noteOpen: boolean;
  selected: boolean;
  isLast: boolean;
  onOpenNote: () => void;
  onSelectedChange: (selected: boolean) => void;
}) {
  const display = measuredOnDisplay(entry.measured_on);
  const [dayText, timeText] = display.text.split(" ");
  const hasNote = entry.note !== null && entry.note !== "";
  const noteLabel = `Show note from ${display.text}`;
  const selectedState = selected ? "selected" : undefined;

  return (
    <Fragment>
      <TableRow data-state={selectedState} className={cn("group border-b-0", !isLast && "measurement-row:border-b")}>
        <TableCell className={cn("w-10 px-0 text-center", stickyBodyClass, "left-0")}>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => {
              onSelectedChange(checked === true);
            }}
            aria-label={`Select measurement from ${display.text}`}
          />
        </TableCell>
        <TableCell className={cn(dateColumnClass, stickyBodyClass, "measurement-row:px-3 left-10 px-2")}>
          <time dateTime={display.dateTime} className="block">
            <span className="measurement-row:hidden block font-semibold">{dayText}</span>
            <span className="text-muted-foreground measurement-row:hidden block">{timeText}</span>
            <span className="measurement-row:inline hidden font-semibold whitespace-nowrap">{display.text}</span>
          </time>
          {readOnly ? null : (
            <div className="measurement-row:hidden mt-1">
              <RowActions
                displayText={display.text}
                editHref={measurementEditHref(entry.id)}
                deleteHref={measurementDeleteHref(entry.id, openEditingId)}
              />
            </div>
          )}
        </TableCell>
        {measurementFields.map((field) => {
          const caption = deltaCaption(entry.deltas?.[field.field]);
          return (
            <TableCell key={field.field} className={cn(metricColumnClass, "px-1 py-2 text-center")}>
              <div className="flex flex-col items-center justify-center">
                <div
                  className="font-semibold"
                  aria-label={accessibleValue(field.label, entry[field.field], field.unit)}
                >
                  {formatMeasurement(entry[field.field])}
                </div>
                <p
                  className={cn("text-xs", caption.muted ? "text-muted-foreground" : "text-card-foreground")}
                  aria-label={
                    entry.deltas ? accessibleDelta(field.label, field.unit, entry.deltas[field.field]) : undefined
                  }
                >
                  {caption.text}
                </p>
              </div>
            </TableCell>
          );
        })}
        <TableCell className="measurement-row:table-cell hidden h-px p-0">
          <NoteRowCell note={entry.note} noteId={entry.id} label={noteLabel} expanded={noteOpen} onClick={onOpenNote} />
        </TableCell>
        {readOnly ? null : (
          <TableCell className="measurement-row:table-cell hidden w-16 px-0">
            <div className="flex items-center justify-center">
              <RowActions
                displayText={display.text}
                editHref={measurementEditHref(entry.id)}
                deleteHref={measurementDeleteHref(entry.id, openEditingId)}
              />
            </div>
          </TableCell>
        )}
      </TableRow>
      <TableRow data-state={selectedState} className="group measurement-row:hidden">
        <TableCell
          colSpan={readOnly ? 11 : 12}
          className="bg-background group-data-[state=selected]:bg-muted px-0 py-2"
        >
          <div
            className={cn(
              "sticky left-0 z-10 flex w-10 justify-center",
              "bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted group-data-[state=selected]:group-hover:bg-muted",
            )}
          >
            <NoteIconSlot
              noteId={entry.id}
              hasNote={hasNote}
              label={noteLabel}
              expanded={noteOpen}
              className="w-10"
              onClick={onOpenNote}
            />
          </div>
        </TableCell>
      </TableRow>
    </Fragment>
  );
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
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
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

  const loadPage = useCallback(
    (query: PageQuery): void => {
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
        if (query.focusId === null && accountId !== null && subjectId !== null) {
          writePreference(journalPageStorageKey(accountId, subjectId), String(body.page));
        }
      });
    },
    [accountId, subjectId],
  );

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
    const storedPageValue = subjectId === null ? null : readStored(journalPageStorageKey(accountId, subjectId));
    const storedPage = storedPageValue === null ? null : parseJournalPage(storedPageValue);
    if (subjectId !== null && storedPage !== null) {
      writeCookie(journalPageStorageKey(accountId, subjectId), String(storedPage));
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
    const pageDiffers = storedPage !== null && storedPage !== pageProp;
    if (!sizeDiffers && !monthDiffers && !pageDiffers) {
      return;
    }
    loadPage({
      month: savedMonth ?? currentMonth,
      page: storedPage ?? pageProp,
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
    pageProp,
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
  const visibleSelectedCount = visibleEntries.filter((entry) => selectedIds.has(entry.id)).length;
  const allVisibleSelected = visibleEntries.length > 0 && visibleSelectedCount === visibleEntries.length;
  const headerChecked = allVisibleSelected ? true : visibleSelectedCount > 0 ? "indeterminate" : false;

  function setVisibleSelected(selected: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const entry of visibleEntries) {
        if (selected) {
          next.add(entry.id);
        } else {
          next.delete(entry.id);
        }
      }
      return next;
    });
  }

  function setEntrySelected(id: string, selected: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
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
  const confirmingEntry =
    openConfirmingId === null
      ? null
      : ((paged ? remoteEntries : entries).find((entry) => entry.id === openConfirmingId) ?? null);
  const noteSource = paged ? remoteEntries : entries;
  const noteEntry = openNoteId === null ? null : (noteSource.find((item) => item.id === openNoteId) ?? null);
  const visibleNote = noteEntry !== null && noteEntry.note !== null && noteEntry.note !== "" ? noteEntry : null;

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
      writePreference(journalPageStorageKey(accountId, subjectId), "1");
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
      if (accountId !== null && subjectId !== null) {
        writePreference(journalPageStorageKey(accountId, subjectId), String(next.page));
      }
      return;
    }
    const keepFocus = focusedEntryId !== null && focusedMonth !== null && focusedMonth === month;
    if (!keepFocus && accountId !== null && subjectId !== null) {
      writePreference(journalPageStorageKey(accountId, subjectId), "1");
    }
    loadPage({
      month,
      page: 1,
      size: nextSize,
      focusId: keepFocus ? focusedEntryId : null,
      traineeId: traineeForRead(),
    });
  }

  function showPage(nextPage: number) {
    if (accountId !== null && subjectId !== null) {
      writePreference(journalPageStorageKey(accountId, subjectId), String(nextPage));
    }
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
      <div className="measurement-row:gap-4 mt-6 flex w-full flex-nowrap items-center gap-1">
        <div ref={monthFieldRef} className="relative z-20 w-auto min-w-0 flex-none">
          <div className="measurement-row:gap-2 flex min-w-0 items-center gap-1" role="group" aria-label="Month">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="measurement-row:size-9 size-8"
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
              className="measurement-row:px-4 grid w-auto max-w-none min-w-0 flex-none shrink-0 overflow-visible px-2"
              aria-expanded={monthListOpen}
              aria-label={monthLabel(month)}
              onClick={() => {
                setMonthListOpen((open) => !open);
              }}
            >
              <span aria-hidden="true" className="invisible col-start-1 row-start-1 flex items-center gap-2">
                <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
                <span className="text-center">{widestMonthLabel(month)}</span>
                <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
              </span>
              <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
                <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-center">{monthLabel(month)}</span>
                <ChevronDown
                  className={cn("measurement-row:inline hidden shrink-0", monthListOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="measurement-row:size-9 size-8"
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
          <div className="measurement-row:gap-2 flex gap-1" role="group" aria-label="Entries per page">
            {pageSizes.map((size) => (
              <Button
                key={size}
                type="button"
                variant={pageSize === size ? "default" : "outline"}
                className="measurement-row:min-w-9 min-w-8 px-2"
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
          <div
            data-measurement-table
            className="border-border bg-background mt-6 w-full max-w-full min-w-0 overflow-hidden rounded-md border"
          >
            <Table className="measurement-row:w-full measurement-row:table-fixed w-max min-w-full">
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className={cn("w-10 px-0 text-center", stickyHeaderClass, "left-0")}>
                    <Checkbox
                      checked={headerChecked}
                      onCheckedChange={(checked) => {
                        setVisibleSelected(checked === true);
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className={cn(dateColumnClass, stickyHeaderClass, "measurement-row:px-3 left-10 px-2")}>
                    <span className="measurement-row:hidden">Date</span>
                    <span className="measurement-row:inline hidden">Date and time</span>
                  </TableHead>
                  {measurementFields.map((field) => (
                    <TableHead
                      key={field.field}
                      className={cn(metricColumnClass, "h-auto px-1 py-2 text-center whitespace-normal")}
                    >
                      <MetricHeader field={field} />
                    </TableHead>
                  ))}
                  <TableHead className="measurement-row:table-cell hidden h-auto px-0 py-2 text-center">
                    <span className="inline-flex w-12 justify-center">Note</span>
                  </TableHead>
                  {readOnly ? null : <TableHead className="measurement-row:table-cell hidden w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry, index) => (
                  <MeasurementEntry
                    key={entry.id}
                    entry={entry}
                    readOnly={readOnly}
                    openEditingId={openEditingId}
                    noteOpen={openNoteId === entry.id}
                    selected={selectedIds.has(entry.id)}
                    isLast={index === visibleEntries.length - 1}
                    onOpenNote={() => {
                      setOpenNoteId((current) => (current === entry.id ? null : entry.id));
                    }}
                    onSelectedChange={(selected) => {
                      setEntrySelected(entry.id, selected);
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
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
      {confirmingEntry === null ? null : (
        <DeleteConfirmToast entry={confirmingEntry} editingId={openEditingId} cancelHref={cancelHref} />
      )}
      {visibleNote === null ? null : (
        <NoteDialog
          entry={visibleNote}
          onClose={() => {
            setOpenNoteId(null);
          }}
        />
      )}
    </div>
  );
}
