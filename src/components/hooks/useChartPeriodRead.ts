import { useEffect, useRef, useState } from "react";

import {
  anchorWithEntries,
  chartPreferenceValue,
  chartQueryAnchor,
  chartWindow,
  defaultChartPeriod,
  entryDays,
  lastYearsRange,
  linkPrevious,
  measuredOnMs,
  monthAnchor,
  parseChartAnchor,
  parseChartPreference,
  type ChartPeriod,
  type ChartWindow,
  type YearsRange,
} from "@/lib/measurement-chart";
import { readStored, writePreference } from "@/lib/browser-storage";
import { journalMonth, measurementMonth, utcToday } from "@/lib/measurement-page";
import { namedId } from "@/lib/utils";
import type { ChartBody, ChartMeasurement, MeasurementWithDeltas } from "@/types";

/** The tile charts a period, or exactly the entries the caller asked for by id. */
type ChartView = { kind: "period" } | { kind: "selected"; ids: readonly string[] };

type ChartResult = { query: string; ok: true; body: ChartBody } | { query: string; ok: false };

/** Entry days for the period picker: `null` while loading; `days: null` when the read failed. */
type DaysState = { query: string; days: string[] | null } | null;

export interface ChartPeriodReadOptions {
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
  /** The remembered week, month or year from the preference cookie; `null` starts from the list's month. */
  initialAnchor?: string | null;
  /** The server's read for `initialPeriod` around `month`, so the first render needs no fetch. */
  initialChart?: ChartBody | null;
  /** The server's entry days for the period picker. */
  initialDays?: string[] | null;
  /** The storage (and cookie) key the period and anchor are remembered under for this account and trainee. */
  periodStorageKey: (accountUserId: string, subjectTraineeId: string) => string;
  /** Read exactly these entries instead of the period; `null` reads the period. */
  overrideIds?: readonly string[] | null;
  /** Called after an `overrideIds` read with the ids asked for and the ids the read found. */
  onOverrideRead?: (requestedIds: readonly string[], foundIds: readonly string[]) => void;
}

export interface ChartPeriodRead {
  period: ChartPeriod;
  anchor: string;
  /** Entry days for the period picker; `null` while loading or after a failed read. */
  days: string[] | null;
  /** The read for the current period or override; `null` while loading or after a failed read. */
  body: ChartBody | null;
  loading: boolean;
  failed: boolean;
  /** Switch period, landing on an anchor with entries when narrowing. */
  choosePeriod: (next: ChartPeriod) => void;
  setAnchor: (anchor: string) => void;
  /** Set the period without moving the anchor (a reset to a first visit). */
  setPeriod: (period: ChartPeriod) => void;
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

function readDays(value: unknown): string[] | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const days = (value as Record<string, unknown>).days;
  if (!Array.isArray(days)) {
    return null;
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
    params.set("anchor", chartQueryAnchor(period, anchor));
  }
  return withTrainee(params, traineeId);
}

function localBody(
  entries: readonly MeasurementWithDeltas[],
  view: ChartView,
  period: ChartPeriod,
  anchor: string,
  years: YearsRange,
): ChartBody {
  // The sink's entries are the whole journal, so each one's predecessor is the entry before it.
  const journal = linkPrevious(
    [...entries].sort((left, right) => measuredOnMs(left.measured_on) - measuredOnMs(right.measured_on)),
    null,
  );
  if (view.kind === "selected") {
    const ids = new Set(view.ids);
    return { entries: journal.filter((entry) => ids.has(entry.id)), window: null };
  }
  const window = chartWindow(period, anchor, years);
  const start = measuredOnMs(window.start);
  const end = measuredOnMs(window.end);
  const inWindow = journal.filter((entry) => {
    const at = measuredOnMs(entry.measured_on);
    return at >= start && at < end;
  });
  return { entries: inWindow, window };
}

/**
 * A chart tile's period, anchor and read: the remembered preference (under the caller's key), the entry days for the
 * picker, and the serial-guarded chart read seeded by the server. With `entries` it charts them locally, without a
 * fetch (kitchen-sink mode).
 */
export function useChartPeriodRead({
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
  periodStorageKey,
  overrideIds = null,
  onOverrideRead,
}: ChartPeriodReadOptions): ChartPeriodRead {
  const todayValue = today ?? utcToday(new Date());
  const listMonth = journalMonth(month ?? null) ?? measurementMonth(todayValue);
  const accountId = namedId(accountUserId);
  const subjectId = namedId(subjectTraineeId);
  const local = entries !== undefined;
  const traineeId = readOnly ? subjectId : null;
  const daysQuery = withTrainee(new URLSearchParams({ days: "1" }), traineeId);
  const years = lastYearsRange(todayValue);
  // The charts keep their own week, month or year apart from the list; only a first visit starts from its month.
  const startAnchor = parseChartAnchor(initialAnchor) ?? monthAnchor(listMonth, todayValue);
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod);
  const [anchor, setAnchor] = useState(startAnchor);
  const [restored, setRestored] = useState(false);
  const view: ChartView = overrideIds === null ? { kind: "period" } : { kind: "selected", ids: overrideIds };
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

  let days: string[] | null = null;
  let daysFailed = false;
  if (entries !== undefined) {
    days = entryDays(entries.map((entry) => entry.measured_on));
  } else if (remoteDays !== null && remoteDays.query === daysQuery) {
    days = remoteDays.days;
    daysFailed = remoteDays.days === null;
  }
  const query = chartQuery(view, period, anchor, years, traineeId);

  // The period and its anchor are a browser preference, applied after the hydration render.
  /* eslint-disable react-hooks/set-state-in-effect -- storage is applied after the hydration render */
  useEffect(() => {
    if (accountId !== null && subjectId !== null) {
      const stored = readStored(periodStorageKey(accountId, subjectId));
      if (stored !== null) {
        const preference = parseChartPreference(stored);
        setPeriod(preference.period);
        if (preference.anchor !== null) {
          setAnchor(preference.anchor);
        }
      }
    }
    setRestored(true);
  }, [accountId, subjectId, periodStorageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Remember the period and anchor in storage and in the cookie the next document request renders from.
  useEffect(() => {
    if (!restored || accountId === null || subjectId === null) {
      return;
    }
    const key = periodStorageKey(accountId, subjectId);
    const value = chartPreferenceValue({ period, anchor });
    writePreference(key, value);
  }, [restored, accountId, subjectId, periodStorageKey, period, anchor]);

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
    const requestedIds = overrideIds;
    void fetchJson(query).then((payload) => {
      if (serial !== requestSerial.current) {
        return;
      }
      const body = readChartBody(payload);
      // A failed read is not "on screen": coming back to this query reads it again.
      shownQuery.current = body === null ? null : query;
      setResult(body === null ? { query, ok: false } : { query, ok: true, body });
      if (requestedIds !== null && body !== null) {
        onOverrideRead?.(
          requestedIds,
          body.entries.map((entry) => entry.id),
        );
      }
    });
  }, [local, restored, query, overrideIds, onOverrideRead]);

  function choosePeriod(next: ChartPeriod) {
    // Narrowing from a year to a week or month lands on an entry instead of the year's first, empty one.
    setAnchor(anchorWithEntries(period, next, anchor, days ?? []));
    setPeriod(next);
  }

  const selected = view.kind === "selected";
  let body: ChartBody | null = null;
  // Without the entry days the period picker cannot be built, so a failed days read is a failed tile.
  let failed = daysFailed && !selected;
  if (entries !== undefined) {
    body = localBody(entries, view, period, anchor, years);
  } else if (result !== null && result.query === query) {
    if (result.ok) {
      body = result.body;
    } else {
      failed = true;
    }
  }
  const loading = forceLoading || (body === null && !failed);

  return { period, anchor, days, body, loading, failed, choosePeriod, setAnchor, setPeriod };
}
