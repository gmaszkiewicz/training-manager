import { useId, useSyncExternalStore, type ReactNode } from "react";

import { ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { chartFieldColor } from "@/lib/measurement-chart";
import { measurementFields } from "@/lib/measurement-input";
import { topSubPeriod, type SubPeriodRow, type TopChangeDirection } from "@/lib/measurement-top-changes";
import type { MeasurementField } from "@/types";

/** A series with at least one change, and the sub-period it changed most in. */
export interface ChangedSeries {
  field: MeasurementField;
  top: SubPeriodRow;
}

/** One plotted datum per sub-period: its key and labels, then each series' summed value. */
export type TopChangeDatum = Record<string, string | number>;

export function fieldDefinition(field: MeasurementField) {
  return measurementFields.find((definition) => definition.field === field) ?? measurementFields[0];
}

/** "+1.0 cm" for a gain, "−0.5 kg" for a loss, "0.0 kg" for no change. */
export function signedValue(field: MeasurementField, difference: number, direction: TopChangeDirection): string {
  const sign = difference === 0 ? "" : direction === "up" ? "+" : "−";
  return `${sign}${difference.toFixed(1)} ${fieldDefinition(field).unit}`;
}

export function changesLabel(count: number): string {
  return count === 1 ? "1 change" : `${String(count)} changes`;
}

function isMeasurementField(value: unknown): value is MeasurementField {
  return measurementFields.some((definition) => definition.field === value);
}

/** The sub-period key of a tooltip item's datum. */
function datumKey(item: unknown): string | null {
  if (typeof item !== "object" || item === null || !("payload" in item)) {
    return null;
  }
  const datum: unknown = item.payload;
  if (typeof datum !== "object" || datum === null || !("key" in datum) || typeof datum.key !== "string") {
    return null;
  }
  return datum.key;
}

/** The series with a change, largest first; the sort is stable, so equal sums keep field order. */
export function changedSeries(rows: readonly SubPeriodRow[], fields: readonly MeasurementField[]): ChangedSeries[] {
  return fields
    .flatMap((field) => {
      const top = topSubPeriod(rows, field);
      return top === null ? [] : [{ field, top }];
    })
    .sort((a, b) => (b.top.values[b.field]?.difference ?? 0) - (a.top.values[a.field]?.difference ?? 0));
}

/** The plotted data: one datum per row, a missing value counting as zero. */
export function chartData(rows: readonly SubPeriodRow[], fields: readonly MeasurementField[]): TopChangeDatum[] {
  return rows.map((row) => ({
    key: row.key,
    axisLabel: row.axisLabel,
    label: row.label,
    ...Object.fromEntries(fields.map((field) => [field, row.values[field]?.difference ?? 0])),
  }));
}

/** A changed series' label carries its top sub-period and value, for the legend below the plot. */
export function seriesConfig(
  fields: readonly MeasurementField[],
  changed: readonly ChangedSeries[],
  direction: TopChangeDirection,
): ChartConfig {
  return Object.fromEntries(
    fields.map((field) => {
      const top = changed.find((series) => series.field === field)?.top;
      const name = fieldDefinition(field).label;
      return [
        field,
        {
          label:
            top === undefined ? (
              name
            ) : (
              <span>
                {name} · {top.label}{" "}
                <span className="text-foreground font-mono font-medium tabular-nums">
                  {signedValue(field, top.values[field]?.difference ?? 0, direction)}
                </span>
              </span>
            ),
          color: chartFieldColor(field),
        },
      ];
    }),
  );
}

/**
 * The tooltip: the sub-period's full label, then per series its colour swatch, name, signed value and change count.
 */
export function topChangeTooltip(rows: readonly SubPeriodRow[], direction: TopChangeDirection) {
  return (
    <ChartTooltipContent
      indicator="dot"
      labelFormatter={(_label, payload) => {
        const key = datumKey(payload[0]);
        return rows.find((row) => row.key === key)?.label ?? null;
      }}
      formatter={(_value, _name, item) => {
        const field = item.dataKey;
        const key = datumKey(item);
        const value = isMeasurementField(field) ? rows.find((row) => row.key === key)?.values[field] : undefined;
        if (!isMeasurementField(field) || value === undefined) {
          return null;
        }
        return (
          <div className="flex w-full items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-xs" style={{ backgroundColor: `var(--color-${field})` }} />
            <span className="text-muted-foreground flex-1">{fieldDefinition(field).label}</span>
            <span className="text-foreground font-mono font-medium tabular-nums">
              {signedValue(field, value.difference, direction)}
            </span>
            <span className="text-muted-foreground">{changesLabel(value.count)}</span>
          </div>
        );
      }}
    />
  );
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

interface FigureProps {
  title: string;
  /** A shorter title shown in place of `title`, e.g. "Top circ. gain"; `title` stays the chart's accessible name. */
  shortTitle?: string;
  header?: ReactNode;
  emptyText: string;
  changed: readonly ChangedSeries[];
  config: ChartConfig;
  /** The plot, labelled by the caption's title id; painted on the client only. */
  children: (titleId: string) => ReactNode;
}

/**
 * The card around a Top progression plot: the caption with the optional header, the empty state when no series
 * changed, the plot area at its final height, and the legend naming each changed series' top sub-period below it.
 */
export function TopChangeFigure({ title, shortTitle, header, emptyText, changed, config, children }: FigureProps) {
  // A short title is what sighted users read; assistive technology still reads the full one.
  const titleText =
    shortTitle === undefined ? (
      title
    ) : (
      <>
        <span aria-hidden="true">{shortTitle}</span>
        <span className="sr-only">{title}</span>
      </>
    );
  const titleId = `top-change-chart-${useId().replace(/:/g, "")}`;
  // Recharts measures the browser, so the server renders the card at its final height and the plot paints on hydration.
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  // Without a header the caption is the title itself, as it always was; with one the title keeps the id the chart is
  // labelled by, so the header's own label never joins the chart's name.
  const caption =
    header === undefined || header === null ? (
      <figcaption id={titleId} className="text-card-foreground text-sm font-semibold">
        {titleText}
      </figcaption>
    ) : (
      <figcaption className="text-card-foreground flex items-center justify-between gap-2 text-sm font-semibold">
        <span id={titleId}>{titleText}</span>
        {/* The negative margin keeps the caption one text line tall, level with the weight card beside it. */}
        <span className="-my-1.5 shrink-0">{header}</span>
      </figcaption>
    );

  if (changed.length === 0) {
    return (
      <figure className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-md border p-3">
        {caption}
        <div className="flex h-96 w-full items-center justify-center">
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        </div>
      </figure>
    );
  }

  return (
    <figure className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-md border p-3">
      {caption}
      <div className="h-96 w-full">{onClient ? children(titleId) : null}</div>
      {/* Below the plot, not inside it: a wrapped legend in the SVG overlaps the plot. */}
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {changed.map(({ field }) => (
          <li key={field} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-xs" style={{ backgroundColor: chartFieldColor(field) }} />
            {config[field].label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
