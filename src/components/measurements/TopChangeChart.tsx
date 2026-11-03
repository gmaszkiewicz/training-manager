import type { ReactNode } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";

import {
  changedSeries,
  chartData,
  seriesConfig,
  TopChangeFigure,
  topChangeTooltip,
} from "@/components/measurements/top-change-chart-parts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { SubPeriodRow, TopChangeDirection } from "@/lib/measurement-top-changes";
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
  /** Rendered beside the title, e.g. the chart's own filter. */
  header?: ReactNode;
}

/** Overlapping series stay readable through each other. */
const SERIES_FILL_OPACITY = 0.15;

/** The outer ring sits above the pair's largest value, so its (enlarged) dot stays inside the grid. */
const RADIUS_HEADROOM = 1.15;

/**
 * One radar chart card: an axis per sub-period of the window and one series per field on the pair's shared scale. The
 * legend names each changed series with its top sub-period and signed value, and that point gets a larger dot. Gains
 * and losses share the line charts' field colours: no good/bad colouring.
 */
export default function TopChangeChart({ title, rows, fields, scale, direction, emptyText, header }: Props) {
  const changed = changedSeries(rows, fields);
  const topKeys = new Map(changed.map(({ field, top }) => [field, top.key]));
  const data = chartData(rows, fields);
  const config = seriesConfig(fields, changed, direction);

  return (
    <TopChangeFigure title={title} header={header} emptyText={emptyText} changed={changed} config={config}>
      {(titleId) => (
        <ChartContainer config={config} className="aspect-auto h-96 w-full" aria-labelledby={titleId}>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid className="stroke-border" />
            <PolarAngleAxis dataKey="axisLabel" tick={{ className: "fill-muted-foreground text-xs" }} />
            <PolarRadiusAxis domain={[0, scale * RADIUS_HEADROOM]} tick={false} axisLine={false} />
            <ChartTooltip cursor={false} content={topChangeTooltip(rows, direction)} />
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
      )}
    </TopChangeFigure>
  );
}
