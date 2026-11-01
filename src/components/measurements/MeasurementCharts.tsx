import { useEffect, useRef, type ReactNode } from "react";

import { useChartPeriodRead } from "@/components/hooks/useChartPeriodRead";
import { useMeasurementChartSelection } from "@/components/hooks/useMeasurementChartSelection";
import ChartPeriodControls from "@/components/measurements/ChartPeriodControls";
import MeasurementChart, { type ChartPoint } from "@/components/measurements/MeasurementChart";
import {
  bucketStartMs,
  chartTickStyle,
  chartHeading,
  chartXDomain,
  chartDateTimeLabel,
  defaultChartPeriod,
  latestPerBucket,
  measuredOnMs,
  selectedChartHeading,
  xTicks,
  type ChartPeriod,
} from "@/lib/measurement-chart";
import { measurementFields } from "@/lib/measurement-input";
import { chartsPeriodStorageKey, utcToday } from "@/lib/measurement-page";
import type { ChartBody, MeasurementWithDeltas } from "@/types";

/** The line tile's id on its `CollapsibleChartTile`, so this island only rewrites its own heading. */
export const chartsTileId = "charts";

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
  /** The remembered week, month or year from the preference cookie; `null` starts from the list's month. */
  initialAnchor?: string | null;
  /** The server's read for `initialPeriod` around `month`, so the first render needs no fetch. */
  initialChart?: ChartBody | null;
  /** The server's entry days for the period picker. */
  initialDays?: string[] | null;
}

/** This island's own tile, found by tile id so another chart tile's heading is never touched. */
function ownTile(root: HTMLElement | null): Element | null | undefined {
  return root?.closest(`[data-chart-tile="${chartsTileId}"]`);
}

function spansYears(points: readonly number[]): boolean {
  if (points.length === 0) {
    return false;
  }
  const years = points.map((point) => new Date(point).getUTCFullYear());
  return Math.min(...years) !== Math.max(...years);
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
  // Clear returns the tile to a first visit: Month mode on the current month, whatever month the list shows.
  // The selection is read before the period hook it feeds, so Clear reaches the hook's setters through a ref.
  const resetRef = useRef<(() => void) | null>(null);
  const { visualizedIds, reconcile } = useMeasurementChartSelection(accountUserId, subjectTraineeId, {
    onClear: () => {
      resetRef.current?.();
    },
  });
  const selected = visualizedIds.length > 0;
  const { period, anchor, days, body, loading, failed, choosePeriod, setAnchor, setPeriod } = useChartPeriodRead({
    accountUserId,
    subjectTraineeId,
    readOnly,
    month,
    today,
    entries,
    forceLoading,
    initialPeriod,
    initialAnchor,
    initialChart,
    initialDays,
    periodStorageKey: chartsPeriodStorageKey,
    overrideIds: selected ? visualizedIds : null,
    // Deleted entries are missing from the read: drop them from the selection, falling back to a period if none remain.
    onOverrideRead: reconcile,
  });
  useEffect(() => {
    resetRef.current = () => {
      setPeriod(defaultChartPeriod);
      setAnchor(todayValue);
    };
  }, [setPeriod, setAnchor, todayValue]);
  const rootRef = useRef<HTMLDivElement>(null);
  const heading = selected ? selectedChartHeading(visualizedIds.length) : chartHeading(period);

  // The summary heading belongs to the server-rendered tile around this island; keep it in step with the period.
  useEffect(() => {
    const tile = ownTile(rootRef.current);
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

  // Hovering "Selected entries (n)" lists the charted entries, oldest first; a period heading has no hover text.
  const selectedHint =
    selected && body !== null ? body.entries.map((entry) => chartDateTimeLabel(entry.measured_on)).join("\n") : "";
  useEffect(() => {
    const title = ownTile(rootRef.current)?.querySelector("[data-charts-title]");
    if (!(title instanceof HTMLElement)) {
      return;
    }
    if (selectedHint === "") {
      title.removeAttribute("title");
    } else {
      title.title = selectedHint;
    }
  }, [selectedHint]);

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

  return (
    <div ref={rootRef} className="flex w-full min-w-0 flex-col gap-4">
      {selected ? null : (
        <ChartPeriodControls
          period={period}
          anchor={anchor}
          days={days}
          today={todayValue}
          onChoosePeriod={choosePeriod}
          onChooseAnchor={setAnchor}
        />
      )}
      {status}
    </div>
  );
}
