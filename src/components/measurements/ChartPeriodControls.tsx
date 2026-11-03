import { ListFilter } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PeriodPicker from "@/components/measurements/PeriodPicker";
import {
  chartKeyAnchor,
  chartPeriodKey,
  chartPeriodLabel,
  chartPeriods,
  compactChartPeriodLabel,
  earlierPeriod,
  laterPeriod,
  periodsWithEntries,
  type ChartPeriod,
} from "@/lib/measurement-chart";
import { widestMonthLabel } from "@/lib/journal-calendar";
import { measurementMonth } from "@/lib/measurement-page";

type SinglePeriod = Exclude<ChartPeriod, "years">;

const periodNames: Record<ChartPeriod, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  years: "Years",
};

function newestFirst(keys: readonly string[]): string[] {
  return [...keys].sort().reverse();
}

interface Props {
  period: ChartPeriod;
  anchor: string;
  /** Entry days the picker offers periods for; `null` while they load. */
  days: string[] | null;
  today: string;
  onChoosePeriod: (period: ChartPeriod) => void;
  onChooseAnchor: (anchor: string) => void;
  /** Rendered after the period buttons, e.g. a tile's own filter. */
  extra?: ReactNode;
  /** Week/Month/Year/Years as toggle buttons, or as an arrowed choice box on the right. */
  periodControl?: "buttons" | "picker";
}

/** The Week/Month/Year/Years choice box: arrows step to the neighbouring period, and the list offers all four. */
function PeriodTypePicker({
  period,
  onChoosePeriod,
}: {
  period: ChartPeriod;
  onChoosePeriod: (period: ChartPeriod) => void;
}) {
  const index = chartPeriods.indexOf(period);
  return (
    <PeriodPicker
      groupLabel="Chart period"
      label={periodNames[period]}
      // The box is as wide as its widest name, "Month", not the date picker's "September 2026".
      widestLabel={periodNames.month}
      options={chartPeriods.map((option) => ({ key: option, label: periodNames[option] }))}
      selectedKey={period}
      previous={{ ariaLabel: "Previous chart period", target: chartPeriods[index - 1] ?? null }}
      next={{ ariaLabel: "Next chart period", target: chartPeriods[index + 1] ?? null }}
      onChoose={(key) => {
        const chosen = chartPeriods.find((option) => option === key);
        if (chosen !== undefined) {
          onChoosePeriod(chosen);
        }
      }}
    />
  );
}

/**
 * The Week/Month/Year/Years choice as an icon button, for a row too narrow for the arrowed box: the same filter icon as
 * a chart's own filter, opening a list of the four with the chosen one marked.
 */
function PeriodTypeMenu({
  period,
  onChoosePeriod,
}: {
  period: ChartPeriod;
  onChoosePeriod: (period: ChartPeriod) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label={`Chart period: ${periodNames[period]}`}>
          <ListFilter aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={period}
          onValueChange={(value) => {
            const chosen = chartPeriods.find((option) => option === value);
            if (chosen !== undefined) {
              onChoosePeriod(chosen);
            }
          }}
        >
          {chartPeriods.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {periodNames[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A chart tile's period row: the picker with previous/next arrows, then the Week/Month/Year/Years buttons (or, with
 * `periodControl="picker"`, an arrowed choice box on the right).
 */
export default function ChartPeriodControls({
  period,
  anchor,
  days,
  today,
  onChoosePeriod,
  onChooseAnchor,
  extra,
  periodControl = "buttons",
}: Props) {
  let picker: ReactNode;
  if (period === "years") {
    // Years is fixed to the last five years: the same box, disabled, keeps the row from jumping.
    picker = (
      <PeriodPicker
        groupLabel="Period"
        label={compactChartPeriodLabel("years", today)}
        widestLabel={widestMonthLabel(measurementMonth(today))}
        options={[]}
        selectedKey=""
        previous={{ ariaLabel: "Previous period", target: null }}
        next={{ ariaLabel: "Next period", target: null }}
        onChoose={() => undefined}
      />
    );
  } else {
    const single: SinglePeriod = period;
    const currentKey = chartPeriodKey(single, anchor);
    const keys = periodsWithEntries(single, days ?? []);
    const options = newestFirst(keys).map((key) => ({
      key,
      label: chartPeriodLabel(single, chartKeyAnchor(single, key, today)),
    }));
    picker = (
      <PeriodPicker
        groupLabel="Period"
        label={compactChartPeriodLabel(single, anchor)}
        ariaLabel={chartPeriodLabel(single, anchor)}
        widestLabel={widestMonthLabel(measurementMonth(anchor))}
        options={options}
        selectedKey={currentKey}
        previous={{ ariaLabel: "Previous period", target: earlierPeriod(currentKey, keys) }}
        next={{ ariaLabel: "Next period", target: laterPeriod(currentKey, keys) }}
        onChoose={(key) => {
          onChooseAnchor(chartKeyAnchor(single, key, today));
        }}
      />
    );
  }

  if (periodControl === "picker") {
    // One line at every width: the arrowed box when the row has room for it beside the date picker, otherwise the
    // icon button. The row's own width decides, so a tile in a narrow column folds even on a wide screen.
    return (
      <div className="@container w-full">
        <div className="flex w-full flex-nowrap items-center gap-1 @lg:gap-4">
          {picker}
          <div className="ml-auto hidden shrink-0 @lg:block">
            <PeriodTypePicker period={period} onChoosePeriod={onChoosePeriod} />
          </div>
          <div className="ml-auto shrink-0 @lg:hidden">
            <PeriodTypeMenu period={period} onChoosePeriod={onChoosePeriod} />
          </div>
          {extra === undefined || extra === null ? null : <div className="shrink-0">{extra}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="measurement-row:flex-nowrap measurement-row:gap-4 flex w-full flex-wrap items-center gap-1 gap-y-2">
      {picker}
      <div className="ml-auto shrink-0">
        <div className="measurement-row:gap-2 flex gap-1" role="group" aria-label="Chart period">
          {chartPeriods.map((option) => (
            <Button
              key={option}
              type="button"
              variant={period === option ? "default" : "outline"}
              className="measurement-row:min-w-9 min-w-8 px-2"
              aria-pressed={period === option}
              onClick={() => {
                onChoosePeriod(option);
              }}
            >
              {periodNames[option]}
            </Button>
          ))}
        </div>
      </div>
      {extra === undefined || extra === null ? null : <div className="shrink-0">{extra}</div>}
    </div>
  );
}
