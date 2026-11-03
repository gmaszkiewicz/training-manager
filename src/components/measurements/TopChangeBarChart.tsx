import { useEffect, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis, type BarShapeProps } from "recharts";

import { useElementWidth } from "@/components/hooks/useElementWidth";
import {
  changedSeries,
  type ChangedSeries,
  chartData,
  seriesConfig,
  TopChangeFigure,
  topChangeTooltip,
  fieldDefinition,
} from "@/components/measurements/top-change-chart-parts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import {
  BAR_GAP,
  topChangeBarLayout,
  valueAxisTicks,
  type SubPeriodRow,
  type TopChangeDirection,
} from "@/lib/measurement-top-changes";
import type { MeasurementField } from "@/types";

interface Props {
  title: string;
  /** Shown in place of `title`, which stays the accessible name. */
  shortTitle?: string;
  /** One row per sub-period, with each series' summed gains (or drops). */
  rows: readonly SubPeriodRow[];
  /** The series, in field order: weight alone, or the selected circumferences. */
  fields: readonly MeasurementField[];
  /** The pair's largest value: the plot's top, so a gain and a loss chart compare. */
  scale: number;
  direction: TopChangeDirection;
  /** Shown under the title when there are no changes, e.g. "No gains in this period". */
  emptyText: string;
  /** Rendered beside the title, e.g. the chart's own filter. */
  header?: ReactNode;
}

/** Bars outside a series' top sub-period are dimmed, so the top one stands out as the larger dot did. */
const OTHER_BAR_OPACITY = 0.55;

/** The pinned value axis' width, in pixels (`w-13`). */
const VALUE_AXIS_WIDTH = 52;

/**
 * The plot's margins, shared by the pinned value axis and the bars so their scales line up. The top one keeps the top
 * tick's label, centred on its line, clear of the card's title.
 */
const PLOT_MARGIN = { top: 12, left: 0, right: 0 };

/**
 * One bar chart card, after the shadcn Bar Chart - Multiple: a group per sub-period of the window and one bar per field
 * on the pair's shared scale. The legend names each changed series with its top sub-period and signed value, and that
 * bar is drawn at full strength. Gains and losses share the line charts' field colours: no good/bad colouring.
 */
export default function TopChangeBarChart({
  title,
  shortTitle,
  rows,
  fields,
  scale,
  direction,
  emptyText,
  header,
}: Props) {
  const changed = changedSeries(rows, fields);
  const config = seriesConfig(fields, changed, direction);

  return (
    <TopChangeFigure
      title={title}
      shortTitle={shortTitle}
      header={header}
      emptyText={emptyText}
      changed={changed}
      config={config}
    >
      {(titleId) => (
        <BarPlot
          titleId={titleId}
          rows={rows}
          fields={fields}
          scale={scale}
          direction={direction}
          changed={changed}
          config={config}
        />
      )}
    </TopChangeFigure>
  );
}

interface BarPlotProps {
  titleId: string;
  rows: readonly SubPeriodRow[];
  fields: readonly MeasurementField[];
  scale: number;
  direction: TopChangeDirection;
  changed: readonly ChangedSeries[];
  config: ChartConfig;
}

/**
 * The plot: a value axis pinned on the left and the bars beside it. Every bar keeps one width in every period, so a
 * month of days scrolls sideways under the pinned axis instead of squeezing its bars.
 */
function BarPlot({ titleId, rows, fields, scale, direction, changed, config }: BarPlotProps) {
  const [scrollRef, scrollWidth] = useElementWidth<HTMLDivElement>();
  const topKeys = new Map(changed.map(({ field, top }) => [field, top.key]));
  // A loss chart is a negative bar chart: its drops hang down from zero, on the same scale as the gains.
  const sign = direction === "down" ? -1 : 1;
  const data = chartData(rows, fields).map((datum) => ({
    ...datum,
    ...Object.fromEntries(fields.map((field) => [field, sign * Number(datum[field])])),
  }));
  const ticks = valueAxisTicks(scale).map((tick) => sign * tick);
  const top = Math.abs(ticks.at(-1) ?? 1);
  const domain: [number, number] = direction === "down" ? [-top, 0] : [0, top];
  // A chart's series share one unit: weight alone (kg) or circumferences (cm).
  const unit = fieldDefinition(fields[0] ?? "weight_kg").unit;
  const layout = scrollWidth === null ? null : topChangeBarLayout(scrollWidth - VALUE_AXIS_WIDTH, rows, fields.length);
  const contentWidth = layout?.contentWidth ?? null;
  const topIndex = rows.findIndex((row) => row.key === changed[0]?.top.key);

  // A plot wider than the card opens on the largest change rather than on the window's first sub-period.
  useEffect(() => {
    const element = scrollRef.current;
    if (element === null || scrollWidth === null || contentWidth === null || topIndex < 0) {
      return;
    }
    const slotWidth = contentWidth / rows.length;
    const plotWidth = scrollWidth - VALUE_AXIS_WIDTH;
    element.scrollLeft = Math.max(0, (topIndex + 0.5) * slotWidth - plotWidth / 2);
  }, [scrollRef, scrollWidth, contentWidth, topIndex, rows.length]);

  return (
    <div ref={scrollRef} className="h-full w-full overflow-x-auto">
      {layout === null ? null : (
        <div className="flex h-full" style={{ width: VALUE_AXIS_WIDTH + layout.contentWidth }}>
          {/* The value axis stays in view while the bars scroll; it repeats the bars' scale, so it is hidden from AT. */}
          <div className="bg-card sticky left-0 z-10 h-full w-13 shrink-0" aria-hidden="true">
            <ChartContainer config={config} className="aspect-auto h-full w-full">
              <BarChart data={data} margin={PLOT_MARGIN}>
                <XAxis dataKey="axisLabel" tick={false} tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  domain={domain}
                  ticks={ticks}
                  width={VALUE_AXIS_WIDTH}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  // The typographic minus, as in the legend's signed values.
                  tickFormatter={(value: number) => `${value < 0 ? "−" : ""}${String(Math.abs(value))} ${unit}`}
                  tick={{ className: "fill-muted-foreground text-xs" }}
                />
                {/* Recharts draws no axis on a chart without a series, so the axis carries an invisible one. */}
                <Bar dataKey={fields[0] ?? "weight_kg"} fillOpacity={0} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </div>
          <div className="h-full" style={{ width: layout.contentWidth }}>
            <ChartContainer config={config} className="aspect-auto h-full w-full" aria-labelledby={titleId}>
              <BarChart data={data} margin={PLOT_MARGIN} barGap={BAR_GAP} barSize={layout.barSize}>
                <CartesianGrid vertical={false} />
                {/* Every tick renders: on Month only the labelled days carry text, the rest are blank. */}
                <XAxis
                  dataKey="axisLabel"
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ className: "fill-muted-foreground text-xs" }}
                />
                <YAxis hide domain={domain} ticks={ticks} />
                <ChartTooltip cursor={false} content={topChangeTooltip(rows, direction)} />
                {fields.map((field) => (
                  <Bar
                    key={field}
                    dataKey={field}
                    fill={`var(--color-${field})`}
                    radius={Math.min(4, Math.floor(layout.barSize / 2))}
                    isAnimationActive={false}
                    shape={(bar: BarShapeProps) => (
                      <Rectangle
                        {...bar}
                        fillOpacity={rows[bar.index]?.key === topKeys.get(field) ? 1 : OTHER_BAR_OPACITY}
                      />
                    )}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </div>
  );
}
