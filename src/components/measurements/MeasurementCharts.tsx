import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import MeasurementChart, { type ChartPoint } from "@/components/measurements/MeasurementChart";
import { Button } from "@/components/ui/button";
import {
  MEASUREMENT_MONTH_EVENT,
  bucketStartMs,
  chartKeyAnchor,
  chartPeriodKey,
  chartPeriodLabel,
  chartPeriods,
  chartTickStyle,
  chartHeading,
  chartWindow,
  chartXDomain,
  compactChartPeriodLabel,
  defaultChartPeriod,
  earlierPeriod,
  entryDays,
  laterPeriod,
  lastYearsRange,
  latestPerBucket,
  linkPrevious,
  measuredOnMs,
  monthAnchor,
  chartPreferenceValue,
  parseChartAnchor,
  parseChartPreference,
  periodsWithEntries,
  selectedChartHeading,
  xTicks,
  type ChartPeriod,
  type ChartWindow,
  type YearsRange,
} from "@/lib/measurement-chart";
import { widestMonthLabel } from "@/lib/journal-calendar";
import { measurementFields } from "@/lib/measurement-input";
import { chartsPeriodStorageKey, journalMonth, measurementMonth, utcToday } from "@/lib/measurement-page";
import { cn } from "@/lib/utils";
import type { ChartMeasurement, MeasurementWithDeltas } from "@/types";

interface Props {
  accountUserId?: string | null;
  subjectTraineeId?: string | null;
  readOnly: boolean;
  month?: string;
  today?: string;
  /** Kitchen-sink local mode: chart these entries without a fetch. */
  entries?: MeasurementWithDeltas[];
  /** Kitchen-sink only: hold the loading state. */
  forceLoading?: boolean;
  /** The period the server rendered from the preference cookie. */
  initialPeriod?: ChartPeriod;
  /** The remembered week, month or year from the preference cookie; `null` follows the list's month. */
  initialAnchor?: string | null;
  /** The server's read for `initialPeriod` around `month`, so the first render needs no fetch. */
  initialChart?: ChartBody | null;
  /** The server's entry days for the period picker. */
  initialDays?: string[] | null;
}

/** Phase 3 switches the tile to the selected entries; until then it always charts a period. */
type ChartView = { kind: "period" } | { kind: "selected"; ids: string[] };

type SinglePeriod = Exclude<ChartPeriod, "years">;

export interface ChartBody {
  entries: ChartMeasurement[];
  window: ChartWindow | null;
}

type ChartResult = { query: string; ok: true; body: ChartBody } | { query: string; ok: false };

/** Entry days for the period picker: `null` while loading, `[]` when the read failed or there are none. */
type DaysState = { query: string; days: string[] } | null;

interface PickerOption {
  key: string;
  label: string;
}

const periodNames: Record<ChartPeriod, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  years: "Years",
};

function namedId(id: string | null | undefined): string | null {
  if (id === null || id === undefined || id === "") {
    return null;
  }
  return id;
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
    // Storage can be blocked; the period still changes on screen.
  }
}

function writeCookie(name: string, value: string): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // The next document request then renders the default period.
  }
}

function readWindow(value: unknown): ChartWindow | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value !== "object") {
    return undefined;
  }
  const window = value as Record<string, unknown>;
  if (typeof window.start !== "string" || typeof window.end !== "string") {
    return undefined;
  }
  return { start: window.start, end: window.end };
}

function readChartBody(value: unknown): ChartBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const body = value as Record<string, unknown>;
  const window = readWindow(body.window);
  if (!Array.isArray(body.entries) || window === undefined) {
    return null;
  }
  return { entries: body.entries as ChartMeasurement[], window };
}

async function fetchJson(query: string): Promise<unknown> {
  try {
    const response = await fetch(`/api/measurements/chart?${query}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return payload;
  } catch {
    return null;
  }
}

function readDays(value: unknown): string[] {
  if (value === null || typeof value !== "object") {
    return [];
  }
  const days = (value as Record<string, unknown>).days;
  if (!Array.isArray(days)) {
    return [];
  }
  return entryDays(days.filter((day): day is string => typeof day === "string"));
}

function withTrainee(params: URLSearchParams, traineeId: string | null): string {
  if (traineeId !== null) {
    params.set("trainee", traineeId);
  }
  return params.toString();
}

function chartQuery(
  view: ChartView,
  period: ChartPeriod,
  anchor: string,
  years: YearsRange,
  traineeId: string | null,
): string {
  const params = new URLSearchParams();
  if (view.kind === "selected") {
    params.set("ids", view.ids.join(","));
  } else if (period === "years") {
    params.set("period", "years");
    params.set("from", String(years.from));
    params.set("to", String(years.to));
  } else {
    params.set("period", period);
    params.set("anchor", anchor);
  }
  return withTrainee(params, traineeId);
}

function localBody(
  entries: readonly MeasurementWithDeltas[],
  period: ChartPeriod,
  anchor: string,
  years: YearsRange,
): ChartBody {
  const window = chartWindow(period, anchor, years);
  const start = measuredOnMs(window.start);
  const end = measuredOnMs(window.end);
  // The sink's entries are the whole journal, so each one's predecessor is the entry before it.
  const journal = linkPrevious(
    [...entries].sort((left, right) => measuredOnMs(left.measured_on) - measuredOnMs(right.measured_on)),
    null,
  );
  const inWindow = journal.filter((entry) => {
    const at = measuredOnMs(entry.measured_on);
    return at >= start && at < end;
  });
  return { entries: inWindow, window };
}

function spansYears(points: readonly number[]): boolean {
  if (points.length === 0) {
    return false;
  }
  const years = points.map((point) => new Date(point).getUTCFullYear());
  return Math.min(...years) !== Math.max(...years);
}

function newestFirst(keys: readonly string[]): string[] {
  return [...keys].sort().reverse();
}

interface PickerStep {
  ariaLabel: string;
  target: string | null;
}

/**
 * The list's month picker: optional previous/next arrows around a button that opens a list of choices, scrolling
 * when long. An invisible widest label keeps the button from changing width.
 */
function PickerField({
  groupLabel,
  label,
  ariaLabel,
  widestLabel,
  options,
  selectedKey,
  previous,
  next,
  onChoose,
}: {
  groupLabel: string;
  label: string;
  ariaLabel?: string;
  widestLabel: string;
  options: PickerOption[];
  selectedKey: string;
  previous?: PickerStep;
  next?: PickerStep;
  onChoose: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrolls = options.length > 6;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || fieldRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !scrolls) {
      return;
    }
    const container = listRef.current;
    const selected = container?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (container === null || selected === null || selected === undefined) {
      return;
    }
    const nextTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2;
    container.scrollTop = Math.max(0, nextTop);
  }, [open, scrolls, selectedKey]);

  function stepButton(step: PickerStep, direction: "previous" | "next") {
    const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="measurement-row:size-9 size-8"
        aria-label={step.ariaLabel}
        disabled={step.target === null}
        onClick={() => {
          setOpen(false);
          if (step.target !== null) {
            onChoose(step.target);
          }
        }}
      >
        <Icon aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div ref={fieldRef} className="relative z-20 w-auto min-w-0 flex-none">
      <div className="measurement-row:gap-2 flex min-w-0 items-center gap-1" role="group" aria-label={groupLabel}>
        {previous === undefined ? null : stepButton(previous, "previous")}
        <Button
          type="button"
          variant="outline"
          className="measurement-row:px-4 grid w-auto max-w-none min-w-0 flex-none shrink-0 overflow-visible px-2"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          disabled={options.length === 0}
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 flex items-center gap-2">
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
            <span className="text-center">{widestLabel}</span>
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
          </span>
          <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-center">{label}</span>
            <ChevronDown
              className={cn("measurement-row:inline hidden shrink-0", open && "rotate-180")}
              aria-hidden="true"
            />
          </span>
        </Button>
        {next === undefined ? null : stepButton(next, "next")}
      </div>
      {open ? (
        <div
          ref={listRef}
          className={cn(
            "bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md",
            scrolls && "max-h-68 overflow-x-hidden overflow-y-auto",
          )}
        >
          {options.map((option) => {
            const pressed = option.key === selectedKey;
            return (
              <Button
                key={option.key}
                type="button"
                variant={pressed ? "default" : "outline"}
                aria-pressed={pressed}
                onClick={() => {
                  setOpen(false);
                  onChoose(option.key);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ChartGrid({ body, period, selected }: { body: ChartBody; period: ChartPeriod; selected: boolean }) {
  // A period plots the latest entry of each day, month or year; the selected entries are plotted as chosen.
  const entries = selected ? body.entries : latestPerBucket(body.entries, period);
  // A period plots each entry on its bucket's start so it sits on its tick; selected entries keep their real time.
  const xs = entries.map((entry) => {
    const at = measuredOnMs(entry.measured_on);
    return selected ? at : bucketStartMs(at, period);
  });
  const ticks = xTicks(xs, body.window, selected ? "selected" : period);
  const domain = chartXDomain(xs, body.window, ticks, selected ? "selected" : period);
  if (domain === null) {
    return null;
  }
  const tickStyle = chartTickStyle(selected ? "selected" : period, spansYears(xs));

  return (
    <div className="measurement-row:grid-cols-2 grid grid-cols-1 gap-4">
      {measurementFields.map((definition) => {
        const points: ChartPoint[] = entries.map((entry, index) => ({
          id: entry.id,
          x: xs[index],
          value: entry[definition.field],
          measuredOn: entry.measured_on,
          previousMeasuredOn: entry.previous_measured_on,
          delta: entry.deltas?.[definition.field] ?? null,
        }));
        return (
          <MeasurementChart
            key={definition.field}
            field={definition.field}
            label={definition.label}
            unit={definition.unit}
            points={points}
            ticks={ticks}
            domain={domain}
            tickStyle={tickStyle}
            showEveryTick={!selected}
          />
        );
      })}
    </div>
  );
}

export default function MeasurementCharts({
  accountUserId = null,
  subjectTraineeId = null,
  readOnly,
  month,
  today,
  entries,
  forceLoading = false,
  initialPeriod = defaultChartPeriod,
  initialAnchor = null,
  initialChart = null,
  initialDays = null,
}: Props) {
  const todayValue = today ?? utcToday(new Date());
  const listMonth = journalMonth(month ?? null) ?? measurementMonth(todayValue);
  const accountId = namedId(accountUserId);
  const subjectId = namedId(subjectTraineeId);
  const local = entries !== undefined;
  const traineeId = readOnly ? subjectId : null;
  const daysQuery = withTrainee(new URLSearchParams({ days: "1" }), traineeId);
  const years = lastYearsRange(todayValue);
  const rememberedAnchor = parseChartAnchor(initialAnchor);
  const startAnchor = rememberedAnchor ?? monthAnchor(listMonth, todayValue);
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod);
  const [anchor, setAnchor] = useState(startAnchor);
  const [restored, setRestored] = useState(false);
  const [view] = useState<ChartView>({ kind: "period" });
  // The server read the same period, anchor and years, so it seeds the first render under the same query.
  const [result, setResult] = useState<ChartResult | null>(() =>
    initialChart === null || local
      ? null
      : {
          query: chartQuery({ kind: "period" }, initialPeriod, startAnchor, years, traineeId),
          ok: true,
          body: initialChart,
        },
  );
  const [remoteDays, setRemoteDays] = useState<DaysState>(() =>
    initialDays === null || local ? null : { query: daysQuery, days: initialDays },
  );
  const requestSerial = useRef(0);
  const shownQuery = useRef(result?.query ?? null);
  const seededDaysQuery = useRef(remoteDays?.query ?? null);
  const rootRef = useRef<HTMLDivElement>(null);
  // A remembered anchor wins on load: the list's load and restore month then leave the tile where it was.
  const anchorRemembered = useRef(rememberedAnchor !== null);

  let days: string[] | null = null;
  if (entries !== undefined) {
    days = entryDays(entries.map((entry) => entry.measured_on));
  } else if (remoteDays !== null && remoteDays.query === daysQuery) {
    days = remoteDays.days;
  }
  const query = chartQuery(view, period, anchor, years, traineeId);
  const heading = view.kind === "selected" ? selectedChartHeading(view.ids.length) : chartHeading(period);

  // The period and its anchor are a browser preference, applied after the hydration render.
  /* eslint-disable react-hooks/set-state-in-effect -- storage is applied after the hydration render */
  useEffect(() => {
    if (accountId !== null && subjectId !== null) {
      const stored = readStored(chartsPeriodStorageKey(accountId, subjectId));
      if (stored !== null) {
        const preference = parseChartPreference(stored);
        setPeriod(preference.period);
        if (preference.anchor !== null) {
          anchorRemembered.current = true;
          setAnchor(preference.anchor);
        }
      }
    }
    setRestored(true);
  }, [accountId, subjectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Remember the period and anchor in storage and in the cookie the next document request renders from.
  useEffect(() => {
    if (!restored || accountId === null || subjectId === null) {
      return;
    }
    const key = chartsPeriodStorageKey(accountId, subjectId);
    const value = chartPreferenceValue({ period, anchor });
    writeStored(key, value);
    writeCookie(key, value);
  }, [restored, accountId, subjectId, period, anchor]);

  useEffect(() => {
    if (local || seededDaysQuery.current === daysQuery) {
      return;
    }
    let current = true;
    void fetchJson(daysQuery).then((payload) => {
      if (current) {
        setRemoteDays({ query: daysQuery, days: readDays(payload) });
      }
    });
    return () => {
      current = false;
    };
  }, [local, daysQuery]);

  useEffect(() => {
    if (local || !restored) {
      return;
    }
    if (shownQuery.current === query) {
      // Already on screen (the server's read, or back to the last result): drop any read still in flight.
      requestSerial.current += 1;
      return;
    }
    const serial = ++requestSerial.current;
    void fetchJson(query).then((payload) => {
      if (serial !== requestSerial.current) {
        return;
      }
      shownQuery.current = query;
      const body = readChartBody(payload);
      setResult(body === null ? { query, ok: false } : { query, ok: true, body });
    });
  }, [local, restored, query]);

  useEffect(() => {
    if (local) {
      return;
    }
    function onMonth(event: Event) {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      const detail: unknown = event.detail;
      if (detail === null || typeof detail !== "object" || !("month" in detail) || typeof detail.month !== "string") {
        return;
      }
      const restoredMonth = !("restored" in detail) || detail.restored !== false;
      if (restoredMonth && anchorRemembered.current) {
        return;
      }
      const nextMonth = journalMonth(detail.month);
      if (nextMonth !== null) {
        setAnchor(monthAnchor(nextMonth, todayValue));
      }
    }
    window.addEventListener(MEASUREMENT_MONTH_EVENT, onMonth);
    return () => {
      window.removeEventListener(MEASUREMENT_MONTH_EVENT, onMonth);
    };
  }, [local, todayValue]);

  // The summary heading belongs to the server-rendered tile around this island; keep it in step with the period.
  useEffect(() => {
    const tile = rootRef.current?.closest("[data-charts-tile]");
    const title = tile?.querySelector("[data-charts-title]");
    const note = tile?.querySelector("[data-charts-note]");
    if (title instanceof HTMLElement) {
      title.textContent = heading.title;
    }
    if (note instanceof HTMLElement) {
      note.textContent = heading.note ?? "";
      note.hidden = heading.note === null;
    }
  }, [heading.title, heading.note]);

  function choosePeriod(next: ChartPeriod) {
    setPeriod(next);
  }

  const selected = view.kind === "selected";
  let body: ChartBody | null = null;
  let failed = false;
  if (entries !== undefined) {
    body = localBody(entries, period, anchor, years);
  } else if (result !== null && result.query === query) {
    if (result.ok) {
      body = result.body;
    } else {
      failed = true;
    }
  }
  const loading = forceLoading || (body === null && !failed);

  let status: ReactNode;
  if (loading) {
    status = (
      <p role="status" className="text-muted-foreground animate-pulse text-sm">
        Loading charts…
      </p>
    );
  } else if (failed || body === null) {
    status = (
      <p role="alert" className="text-muted-foreground text-sm">
        Could not load charts
      </p>
    );
  } else if (body.entries.length === 0) {
    status = <p className="text-muted-foreground text-sm">No measurements in this period</p>;
  } else {
    status = <ChartGrid body={body} period={period} selected={selected} />;
  }

  let picker: ReactNode;
  if (period === "years") {
    // Years is fixed to the last five years: the same box, disabled, keeps the row from jumping.
    picker = (
      <PickerField
        groupLabel="Period"
        label={compactChartPeriodLabel("years", todayValue)}
        widestLabel={widestMonthLabel(measurementMonth(todayValue))}
        options={[]}
        selectedKey=""
        previous={{ ariaLabel: "Previous period", target: null }}
        next={{ ariaLabel: "Next period", target: null }}
        onChoose={() => undefined}
      />
    );
  } else {
    const single: SinglePeriod = period;
    const currentKey = chartPeriodKey(single, anchor);
    const keys = periodsWithEntries(single, days ?? []);
    const options = newestFirst(keys).map((key) => ({
      key,
      label: chartPeriodLabel(single, chartKeyAnchor(single, key, todayValue)),
    }));
    picker = (
      <PickerField
        groupLabel="Period"
        label={compactChartPeriodLabel(single, anchor)}
        ariaLabel={chartPeriodLabel(single, anchor)}
        widestLabel={widestMonthLabel(measurementMonth(anchor))}
        options={options}
        selectedKey={currentKey}
        previous={{ ariaLabel: "Previous period", target: earlierPeriod(currentKey, keys) }}
        next={{ ariaLabel: "Next period", target: laterPeriod(currentKey, keys) }}
        onChoose={(key) => {
          setAnchor(chartKeyAnchor(single, key, todayValue));
        }}
      />
    );
  }

  return (
    <div ref={rootRef} className="flex w-full min-w-0 flex-col gap-4">
      {view.kind === "selected" ? null : (
        <div className="measurement-row:flex-nowrap measurement-row:gap-4 flex w-full flex-wrap items-center gap-1 gap-y-2">
          {picker}
          <div className="ml-auto shrink-0">
            <div className="measurement-row:gap-2 flex gap-1" role="group" aria-label="Chart period">
              {chartPeriods.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={period === option ? "default" : "outline"}
                  className="measurement-row:min-w-9 min-w-8 px-2"
                  aria-pressed={period === option}
                  onClick={() => {
                    choosePeriod(option);
                  }}
                >
                  {periodNames[option]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      {status}
    </div>
  );
}
