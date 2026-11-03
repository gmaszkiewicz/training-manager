import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { useChartPeriodRead } from "@/components/hooks/useChartPeriodRead";
import { useLastSettled } from "@/components/hooks/useLastSettled";
import { useStoredFields } from "@/components/hooks/useStoredFields";
import ChartPeriodControls from "@/components/measurements/ChartPeriodControls";
import TopChangeBarChart from "@/components/measurements/TopChangeBarChart";
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
import {
  topChartsGainFieldsStorageKey,
  topChartsLossFieldsStorageKey,
  topChartsPeriodStorageKey,
  utcToday,
} from "@/lib/measurement-page";
import { changedSubPeriods, circumferenceFields, subPeriodTotals, topChangeScale } from "@/lib/measurement-top-changes";
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
  /** The circumference gain chart's fields from the preference cookie; all 7 when absent. */
  initialGainFields?: readonly CircumferenceField[];
  /** The circumference loss chart's fields from the preference cookie; all 7 when absent. */
  initialLossFields?: readonly CircumferenceField[];
}

function TopChangesGridRc({
  body,
  period,
  window,
  gainFields,
  lossFields,
  onGainFieldsChange,
  onLossFieldsChange,
}: {
  body: ChartBody;
  period: ChartPeriod;
  window: ChartWindow;
  gainFields: readonly CircumferenceField[];
  lossFields: readonly CircumferenceField[];
  onGainFieldsChange: (fields: CircumferenceField[]) => void;
  onLossFieldsChange: (fields: CircumferenceField[]) => void;
}) {
  // Every entry in the window counts, before any bucketing, so no change is lost. A month has one axis per day.
  // Memoised on the window's bounds, not its object, which the caller may rebuild on every render.
  const { start, end } = window;
  const { weightGain, weightLoss, weightScale } = useMemo(() => {
    const bounds = { start, end };
    const gain = subPeriodTotals(body.entries, weightSeries, period, bounds, "up", { monthAxis: "days" });
    const loss = subPeriodTotals(body.entries, weightSeries, period, bounds, "down", { monthAxis: "days" });
    return {
      weightGain: changedSubPeriods(gain, period),
      weightLoss: changedSubPeriods(loss, period),
      weightScale: topChangeScale(gain, loss),
    };
  }, [body, period, start, end]);
  const { circumferenceGain, circumferenceLoss, circumferenceScale } = useMemo(() => {
    const bounds = { start, end };
    const gain = subPeriodTotals(body.entries, gainFields, period, bounds, "up", { monthAxis: "days" });
    const loss = subPeriodTotals(body.entries, lossFields, period, bounds, "down", { monthAxis: "days" });
    // Each chart keeps its own fields; the pair still shares one scale, over the union of both selections.
    // The bars show only the sub-periods with a change (every year of a span); the scale is unchanged by it.
    return {
      circumferenceGain: changedSubPeriods(gain, period),
      circumferenceLoss: changedSubPeriods(loss, period),
      circumferenceScale: topChangeScale(gain, loss),
    };
  }, [body, gainFields, lossFields, period, start, end]);

  return (
    <div className="measurement-row:grid-cols-2 grid grid-cols-1 gap-4">
      <TopChangeBarChart
        title="Top weight gain"
        rows={weightGain}
        fields={weightSeries}
        scale={weightScale}
        direction="up"
        emptyText="No gains in this period"
      />
      <TopChangeBarChart
        title="Top circumference gain"
        shortTitle="Top circ. gain"
        rows={circumferenceGain}
        fields={gainFields}
        scale={circumferenceScale}
        direction="up"
        emptyText="No gains in this period"
        header={
          <CircumferenceFilter
            fields={gainFields}
            onChange={onGainFieldsChange}
            iconLabel="Filter circumferences: Top circumference gain"
          />
        }
      />
      <TopChangeBarChart
        title="Top weight loss"
        rows={weightLoss}
        fields={weightSeries}
        scale={weightScale}
        direction="down"
        emptyText="No losses in this period"
      />
      <TopChangeBarChart
        title="Top circumference loss"
        shortTitle="Top circ. loss"
        rows={circumferenceLoss}
        fields={lossFields}
        scale={circumferenceScale}
        direction="down"
        emptyText="No losses in this period"
        header={
          <CircumferenceFilter
            fields={lossFields}
            onChange={onLossFieldsChange}
            iconLabel="Filter circumferences: Top circumference loss"
          />
        }
      />
    </div>
  );
}

/**
 * Top progression 0.9 (RC): the date picker on the left and an arrowed Week/Month/Year/Years box on the right, a
 * circumference filter per chart and bar groups only for the days or months with a change (every year on Last 5 years). Shares the period preference with 0.1.
 */
export default function TopChangesChartsRc({
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
  initialGainFields = circumferenceFields,
  initialLossFields = circumferenceFields,
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
  const [gainFields, setGainFields] = useStoredFields(
    initialGainFields,
    accountId,
    subjectId,
    topChartsGainFieldsStorageKey,
  );
  const [lossFields, setLossFields] = useStoredFields(
    initialLossFields,
    accountId,
    subjectId,
    topChartsLossFieldsStorageKey,
  );
  const rootRef = useRef<HTMLDivElement>(null);

  // The summary heading belongs to the server-rendered tile around this island, written once to its own tile only.
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

  // The last read that drew charts: while the next period loads the tile keeps it, dimmed, instead of collapsing.
  const shown = useMemo(
    () =>
      loading || failed || body === null || body.entries.length === 0
        ? null
        : // The read names its window; the kitchen sink's and an older read's fall back to the period's own.
          { body, period, window: body.window ?? chartWindow(period, anchor, lastYearsRange(todayValue)) },
    [loading, failed, body, period, anchor, todayValue],
  );
  const lastShown = useLastSettled(shown);

  let status: ReactNode;
  if (loading && lastShown !== null) {
    status = (
      <div aria-busy="true" className="opacity-60 transition-opacity">
        <p role="status" className="sr-only">
          Loading charts…
        </p>
        <TopChangesGridRc
          body={lastShown.body}
          period={lastShown.period}
          window={lastShown.window}
          gainFields={gainFields}
          lossFields={lossFields}
          onGainFieldsChange={setGainFields}
          onLossFieldsChange={setLossFields}
        />
      </div>
    );
  } else if (loading) {
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
    const window = shown?.window ?? chartWindow(period, anchor, lastYearsRange(todayValue));
    status = (
      <TopChangesGridRc
        body={body}
        period={period}
        window={window}
        gainFields={gainFields}
        lossFields={lossFields}
        onGainFieldsChange={setGainFields}
        onLossFieldsChange={setLossFields}
      />
    );
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
        periodControl="picker"
      />
      {status}
    </div>
  );
}
