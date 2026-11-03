import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ListFilter } from "lucide-react";

import { useChartPeriodRead } from "@/components/hooks/useChartPeriodRead";
import ChartPeriodControls from "@/components/measurements/ChartPeriodControls";
import TopChangeChart from "@/components/measurements/TopChangeChart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { readStored, writePreference } from "@/lib/browser-storage";
import {
  chartWindow,
  defaultChartPeriod,
  lastYearsRange,
  type ChartHeading,
  type ChartPeriod,
  type ChartWindow,
} from "@/lib/measurement-chart";
import { measurementFields } from "@/lib/measurement-input";
import {
  parseTopChartsFields,
  topChartsFieldsStorageKey,
  topChartsFieldsValue,
  topChartsPeriodStorageKey,
  utcToday,
} from "@/lib/measurement-page";
import { circumferenceFields, subPeriodTotals, topChangeScale } from "@/lib/measurement-top-changes";
import { namedId } from "@/lib/utils";
import type { ChartBody, CircumferenceField, MeasurementField, MeasurementWithDeltas } from "@/types";

/** The Top progression tile's id on its `CollapsibleTile`, so this island only rewrites its own heading. */
export const topChangesTileId = "top-changes";

/** The tile's summary heading: the title and the muted note naming the change measure. */
export const topChangesHeading: ChartHeading = {
  title: "Top progression",
  note: "Summed changes versus the previous entry",
};

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

/** This island's own tile, found by tile id so another chart tile's heading is never touched. */
export function ownTile(root: HTMLElement | null): Element | null | undefined {
  return root?.closest(`[data-tile="${topChangesTileId}"]`);
}

function fieldLabel(field: CircumferenceField): string {
  return measurementFields.find((definition) => definition.field === field)?.label ?? field;
}

/** The weight radars' only series. */
export const weightSeries: readonly MeasurementField[] = ["weight_kg"];

/**
 * The circumference filter: a checkbox per field; the last checked one cannot be unchecked. It opens from a
 * "Circumferences" button, or, given `iconLabel`, from a filter icon button with that aria-label.
 */
export function CircumferenceFilter({
  fields,
  onChange,
  iconLabel,
}: {
  fields: readonly CircumferenceField[];
  onChange: (fields: CircumferenceField[]) => void;
  iconLabel?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {iconLabel === undefined ? (
          <Button type="button" variant="outline" className="measurement-row:px-4 px-2">
            Circumferences
            <ChevronDown className="measurement-row:inline hidden shrink-0" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label={iconLabel}>
            <ListFilter aria-hidden="true" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {circumferenceFields.map((field) => {
          const checked = fields.includes(field);
          return (
            <DropdownMenuCheckboxItem
              key={field}
              checked={checked}
              disabled={checked && fields.length <= 1}
              onSelect={(event) => {
                // Keep the menu open so several fields can be toggled in a row.
                event.preventDefault();
              }}
              onCheckedChange={(next) => {
                const selection = next ? [...fields, field] : fields.filter((current) => current !== field);
                onChange(circumferenceFields.filter((candidate) => selection.includes(candidate)));
              }}
            >
              {fieldLabel(field)}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const [fields, setFields] = useState<CircumferenceField[]>(() =>
    parseTopChartsFields(topChartsFieldsValue(initialFields)),
  );
  const [fieldsRestored, setFieldsRestored] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The circumference filter is a browser preference, applied after the hydration render.
  /* eslint-disable react-hooks/set-state-in-effect -- storage is applied after the hydration render */
  useEffect(() => {
    if (accountId !== null && subjectId !== null) {
      const stored = readStored(topChartsFieldsStorageKey(accountId, subjectId));
      if (stored !== null) {
        setFields(parseTopChartsFields(stored));
      }
    }
    setFieldsRestored(true);
  }, [accountId, subjectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Remember the filter in storage and in the cookie the next document request renders from.
  useEffect(() => {
    if (!fieldsRestored || accountId === null || subjectId === null) {
      return;
    }
    writePreference(topChartsFieldsStorageKey(accountId, subjectId), topChartsFieldsValue(fields));
  }, [fieldsRestored, accountId, subjectId, fields]);

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
