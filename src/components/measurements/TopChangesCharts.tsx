import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { useChartPeriodRead } from "@/components/hooks/useChartPeriodRead";
import { useStoredFields } from "@/components/hooks/useStoredFields";
import ChartPeriodControls from "@/components/measurements/ChartPeriodControls";
import TopChangeChart from "@/components/measurements/TopChangeChart";
import {
  CircumferenceFilter,
  ownTile,
  topChangesHeading,
  weightSeries,
} from "@/components/measurements/top-change-chart-parts";
import {
  chartWindow,
  defaultChartPeriod,
  lastYearsRange,
  type ChartPeriod,
  type ChartWindow,
} from "@/lib/measurement-chart";
import { topChartsFieldsStorageKey, topChartsPeriodStorageKey, utcToday } from "@/lib/measurement-page";
import { circumferenceFields, subPeriodTotals, topChangeScale } from "@/lib/measurement-top-changes";
import { namedId } from "@/lib/utils";
import type { ChartBody, CircumferenceField, MeasurementWithDeltas } from "@/types";

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
  /** The circumferences from the preference cookie; all 7 when absent. */
  initialFields?: readonly CircumferenceField[];
}

function TopChangesGrid({
  body,
  period,
  window,
  fields,
}: {
  body: ChartBody;
  period: ChartPeriod;
  window: ChartWindow;
  fields: readonly CircumferenceField[];
}) {
  // Every entry in the window counts, before any bucketing, so no change is lost. Both pairs share the sub-period axes.
  // Memoised on the window's bounds, not its object, which the caller may rebuild on every render.
  const { start, end } = window;
  const { weightGain, weightLoss, weightScale } = useMemo(() => {
    const bounds = { start, end };
    const gain = subPeriodTotals(body.entries, weightSeries, period, bounds, "up");
    const loss = subPeriodTotals(body.entries, weightSeries, period, bounds, "down");
    // Each pair shares one radar scale over every series, so a gain and a loss compare.
    return { weightGain: gain, weightLoss: loss, weightScale: topChangeScale(gain, loss) };
  }, [body, period, start, end]);
  const { circumferenceGain, circumferenceLoss, circumferenceScale } = useMemo(() => {
    const bounds = { start, end };
    const gain = subPeriodTotals(body.entries, fields, period, bounds, "up");
    const loss = subPeriodTotals(body.entries, fields, period, bounds, "down");
    return { circumferenceGain: gain, circumferenceLoss: loss, circumferenceScale: topChangeScale(gain, loss) };
  }, [body, fields, period, start, end]);

  return (
    <div className="measurement-row:grid-cols-2 grid grid-cols-1 gap-4">
      <TopChangeChart
        title="Top weight gain"
        rows={weightGain}
        fields={weightSeries}
        scale={weightScale}
        direction="up"
        emptyText="No gains in this period"
      />
      <TopChangeChart
        title="Top circumference gain"
        rows={circumferenceGain}
        fields={fields}
        scale={circumferenceScale}
        direction="up"
        emptyText="No gains in this period"
      />
      <TopChangeChart
        title="Top weight loss"
        rows={weightLoss}
        fields={weightSeries}
        scale={weightScale}
        direction="down"
        emptyText="No losses in this period"
      />
      <TopChangeChart
        title="Top circumference loss"
        rows={circumferenceLoss}
        fields={fields}
        scale={circumferenceScale}
        direction="down"
        emptyText="No losses in this period"
      />
    </div>
  );
}

export default function TopChangesCharts({
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
  initialFields = circumferenceFields,
}: Props) {
  const todayValue = today ?? utcToday(new Date());
  const accountId = namedId(accountUserId);
  const subjectId = namedId(subjectTraineeId);
  const { period, anchor, days, body, loading, failed, choosePeriod, setAnchor } = useChartPeriodRead({
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
    periodStorageKey: topChartsPeriodStorageKey,
  });
  // The circumference filter is a browser preference, applied after the hydration render.
  const [fields, setFields] = useStoredFields(initialFields, accountId, subjectId, topChartsFieldsStorageKey);
  const rootRef = useRef<HTMLDivElement>(null);

  // The summary heading belongs to the server-rendered tile around this island. Its title and note name the change
  // measure, which no period changes, so the island writes them once to its own tile only.
  useEffect(() => {
    const tile = ownTile(rootRef.current);
    const title = tile?.querySelector("[data-tile-title]");
    const note = tile?.querySelector("[data-tile-note]");
    if (title instanceof HTMLElement) {
      title.textContent = topChangesHeading.title;
    }
    if (note instanceof HTMLElement) {
      note.textContent = topChangesHeading.note ?? "";
      note.hidden = topChangesHeading.note === null;
    }
  }, []);

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
    // The read names its window; the kitchen sink's and an older read's fall back to the period's own.
    const window = body.window ?? chartWindow(period, anchor, lastYearsRange(todayValue));
    status = <TopChangesGrid body={body} period={period} window={window} fields={fields} />;
  }

  return (
    <div ref={rootRef} className="flex w-full min-w-0 flex-col gap-4">
      <ChartPeriodControls
        period={period}
        anchor={anchor}
        days={days}
        today={todayValue}
        onChoosePeriod={choosePeriod}
        onChooseAnchor={setAnchor}
        extra={<CircumferenceFilter fields={fields} onChange={setFields} />}
      />
      {status}
    </div>
  );
}
