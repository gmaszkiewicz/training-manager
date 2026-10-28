import { useId, useSyncExternalStore } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { useElementWidth } from "@/components/hooks/useElementWidth";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  chartDateTimeLabel,
  chartFieldColor,
  chartTickLabel,
  maxTickLabels,
  thinTicks,
  yAxis,
  type ChartTickStyle,
} from "@/lib/measurement-chart";
import { formatDelta } from "@/lib/measurement-deltas";
import { toMeasuredOnLocalValue } from "@/lib/measurement-input";
import type { FieldDelta, MeasurementField } from "@/types";

export interface ChartPoint {
  id: string;
  x: number;
  value: number;
  measuredOn: string;
  previousMeasuredOn: string | null;
  delta: FieldDelta | null;
}

interface Props {
  field: MeasurementField;
  label: string;
  unit: "kg" | "cm";
  points: ChartPoint[];
  ticks: number[];
  domain: [number, number];
  tickStyle: ChartTickStyle;
  /** A period's ticks are already spaced to fit, so each one is drawn; selected entries let recharts thin them. */
  showEveryTick: boolean;
}

function isChartPoint(value: unknown): value is ChartPoint {
  return (
    value !== null &&
    typeof value === "object" &&
    "measuredOn" in value &&
    typeof value.measuredOn === "string" &&
    "value" in value &&
    typeof value.value === "number"
  );
}

/** "↑ 0.4 kg vs 25 Oct 2026, 08:00", or "First entry" when nothing came before. */
function differenceText(point: ChartPoint, unit: string): string {
  if (point.delta === null) {
    return "First entry";
  }
  const difference = `${formatDelta(point.delta)} ${unit}`;
  return point.previousMeasuredOn === null
    ? difference
    : `${difference} vs ${chartDateTimeLabel(point.previousMeasuredOn)}`;
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

// The y-axis and the right margin take this much of the chart's width away from the x-axis labels.
const PLOT_INSET = 60;

function measuredOnText(measuredOn: string): string {
  return toMeasuredOnLocalValue(measuredOn).replace("T", " ");
}

export default function MeasurementChart({
  field,
  label,
  unit,
  points,
  ticks,
  domain,
  tickStyle,
  showEveryTick,
}: Props) {
  const titleId = `measurement-chart-${field}-${useId().replace(/:/g, "")}`;
  // Recharts measures the browser, so the server renders the card at its final height and the plot paints on hydration.
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [plotRef, plotWidth] = useElementWidth<HTMLDivElement>();
  // Every point is drawn; only the labels are thinned to what fits, and recharts draws exactly those.
  const shownTicks = plotWidth === null ? ticks : thinTicks(ticks, maxTickLabels(plotWidth - PLOT_INSET, tickStyle));
  const axis = yAxis(
    points.map((point) => point.value),
    field,
  );
  if (axis === null) {
    return null;
  }
  const config = { value: { label, color: chartFieldColor(field) } } satisfies ChartConfig;

  return (
    <figure className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-md border p-3">
      <figcaption id={titleId} className="text-card-foreground text-sm font-semibold">
        {label} ({unit})
      </figcaption>
      <div ref={plotRef} className="h-56 w-full">
        {onClient ? (
          <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-labelledby={titleId}>
            <LineChart accessibilityLayer data={points} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={domain}
                ticks={shownTicks}
                tickFormatter={(value: number) => chartTickLabel(value, tickStyle)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={showEveryTick ? 0 : "preserveEnd"}
                minTickGap={16}
              />
              <YAxis
                domain={axis.domain}
                ticks={axis.ticks}
                allowDataOverflow={false}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={40}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_value, payload) => {
                      const point: unknown = payload[0]?.payload;
                      return isChartPoint(point) ? measuredOnText(point.measuredOn) : null;
                    }}
                    formatter={(_value, _name, item) => {
                      const point: unknown = item.payload;
                      if (!isChartPoint(point)) {
                        return null;
                      }
                      return (
                        <div className="flex w-full flex-col gap-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {point.value.toFixed(1)} {unit}
                            </span>
                          </div>
                          <span className="text-muted-foreground">{differenceText(point, unit)}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Line
                type="linear"
                dataKey="value"
                name={label}
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-value)", stroke: "var(--color-value)" }}
                activeDot={{ r: 5, fill: "var(--color-value)", stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        ) : null}
      </div>
    </figure>
  );
}
