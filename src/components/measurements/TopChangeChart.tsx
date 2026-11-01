import { useId, useSyncExternalStore } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { chartFieldColor } from "@/lib/measurement-chart";
import { measurementFields } from "@/lib/measurement-input";
import { topSubPeriod, type SubPeriodRow, type TopChangeDirection } from "@/lib/measurement-top-changes";
import type { MeasurementField } from "@/types";

interface Props {
  title: string;
  /** One row per sub-period axis, with each series' summed gains (or drops). */
  rows: readonly SubPeriodRow[];
  /** The series, in field order: weight alone, or the selected circumferences. */
  fields: readonly MeasurementField[];
  /** The pair's largest value: the radar's outer edge, so a gain and a loss chart compare. */
  scale: number;
  direction: TopChangeDirection;
  /** Shown under the title when there are no changes, e.g. "No gains in this period". */
  emptyText: string;
}

/** Overlapping series stay readable through each other. */
const SERIES_FILL_OPACITY = 0.15;

/** The outer ring sits above the pair's largest value, so its (enlarged) dot stays inside the grid. */
const RADIUS_HEADROOM = 1.15;

function fieldDefinition(field: MeasurementField) {
  return measurementFields.find((definition) => definition.field === field) ?? measurementFields[0];
}

/** "+1.0 cm" for a gain, "−0.5 kg" for a loss, "0.0 kg" for no change. */
function signedValue(field: MeasurementField, difference: number, direction: TopChangeDirection): string {
  const sign = difference === 0 ? "" : direction === "up" ? "+" : "−";
  return `${sign}${difference.toFixed(1)} ${fieldDefinition(field).unit}`;
}

function changesLabel(count: number): string {
  return count === 1 ? "1 change" : `${String(count)} changes`;
}

function isMeasurementField(value: unknown): value is MeasurementField {
  return measurementFields.some((definition) => definition.field === value);
}

/** The sub-period key of a tooltip item's radar datum. */
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

function subscribeToNothing(): () => void {
  return () => undefined;
}

/**
 * One radar chart card: an axis per sub-period of the window and one series per field on the pair's shared scale. The
 * legend names each changed series with its top sub-period and signed value, and that point gets a larger dot. Gains
 * and losses share the line charts' field colours: no good/bad colouring.
 */
export default function TopChangeChart({ title, rows, fields, scale, direction, emptyText }: Props) {
  const titleId = `top-change-chart-${useId().replace(/:/g, "")}`;
  // Recharts measures the browser, so the server renders the card at its final height and the radar paints on hydration.
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  // Largest first for the legend; the sort is stable, so equal sums keep field order.
  const changed = fields
    .flatMap((field) => {
      const top = topSubPeriod(rows, field);
      return top === null ? [] : [{ field, top }];
    })
    .sort((a, b) => (b.top.values[b.field]?.difference ?? 0) - (a.top.values[a.field]?.difference ?? 0));

  if (changed.length === 0) {
    return (
      <figure className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-md border p-3">
        <figcaption id={titleId} className="text-card-foreground text-sm font-semibold">
          {title}
        </figcaption>
        <div className="flex h-96 w-full items-center justify-center">
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        </div>
      </figure>
    );
  }

  const topKeys = new Map(changed.map(({ field, top }) => [field, top.key]));
  const data = rows.map((row) => ({
    key: row.key,
    axisLabel: row.axisLabel,
    label: row.label,
    ...Object.fromEntries(fields.map((field) => [field, row.values[field]?.difference ?? 0])),
  }));
  // A changed series' label carries its top sub-period and value, for the legend below the plot.
  const config: ChartConfig = Object.fromEntries(
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
  return (
    <figure className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-md border p-3">
      <figcaption id={titleId} className="text-card-foreground text-sm font-semibold">
        {title}
      </figcaption>
      <div className="h-96 w-full">
        {onClient ? (
          <ChartContainer config={config} className="aspect-auto h-96 w-full" aria-labelledby={titleId}>
            <RadarChart data={data} outerRadius="75%">
              <PolarGrid className="stroke-border" />
              <PolarAngleAxis dataKey="axisLabel" tick={{ className: "fill-muted-foreground text-xs" }} />
              <PolarRadiusAxis domain={[0, scale * RADIUS_HEADROOM]} tick={false} axisLine={false} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_label, payload) => {
                      const key = datumKey(payload[0]);
                      return rows.find((row) => row.key === key)?.label ?? null;
                    }}
                    formatter={(_value, _name, item) => {
                      const field = item.dataKey;
                      const key = datumKey(item);
                      const value = isMeasurementField(field)
                        ? rows.find((row) => row.key === key)?.values[field]
                        : undefined;
                      if (!isMeasurementField(field) || value === undefined) {
                        return null;
                      }
                      return (
                        <div className="flex w-full items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-xs"
                            style={{ backgroundColor: `var(--color-${field})` }}
                          />
                          <span className="text-muted-foreground flex-1">{fieldDefinition(field).label}</span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {signedValue(field, value.difference, direction)}
                          </span>
                          <span className="text-muted-foreground">{changesLabel(value.count)}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              {fields.map((field) => (
                <Radar
                  key={field}
                  dataKey={field}
                  stroke={`var(--color-${field})`}
                  fill={`var(--color-${field})`}
                  fillOpacity={SERIES_FILL_OPACITY}
                  isAnimationActive={false}
                  dot={({ cx, cy, index, value }: { cx?: number; cy?: number; index?: number; value?: unknown }) => {
                    if (cx === undefined || cy === undefined || typeof value !== "number" || value === 0) {
                      return null;
                    }
                    const top = index !== undefined && rows[index]?.key === topKeys.get(field);
                    return (
                      <circle
                        key={`${field}-${String(index)}`}
                        cx={cx}
                        cy={cy}
                        r={top ? 6 : 3}
                        fill={`var(--color-${field})`}
                        className="stroke-card"
                        strokeWidth={top ? 2 : 1}
                      />
                    );
                  }}
                />
              ))}
            </RadarChart>
          </ChartContainer>
        ) : null}
      </div>
      {/* Below the plot, not inside it: a wrapped legend in the SVG overlaps the radar. */}
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
