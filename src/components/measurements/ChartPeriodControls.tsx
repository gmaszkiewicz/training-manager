import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type SinglePeriod = Exclude<ChartPeriod, "years">;

interface PickerOption {
  key: string;
  label: string;
}

interface PickerStep {
  ariaLabel: string;
  target: string | null;
}

const periodNames: Record<ChartPeriod, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  years: "Years",
};

function newestFirst(keys: readonly string[]): string[] {
  return [...keys].sort().reverse();
}

/**
 * The period picker: optional previous/next arrows around a button that opens a list of choices, scrolling past
 * five. An invisible widest label keeps the button from changing width.
 */
function PickerField({
  groupLabel,
  label,
  ariaLabel,
  widestLabel,
  options,
  selectedKey,
  previous,
  next,
  onChoose,
}: {
  groupLabel: string;
  label: string;
  ariaLabel?: string;
  widestLabel: string;
  options: PickerOption[];
  selectedKey: string;
  previous?: PickerStep;
  next?: PickerStep;
  onChoose: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrolls = options.length > 5;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || fieldRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !scrolls) {
      return;
    }
    const container = listRef.current;
    const selected = container?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (container === null || selected === null || selected === undefined) {
      return;
    }
    const nextTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2;
    container.scrollTop = Math.max(0, nextTop);
  }, [open, scrolls, selectedKey]);

  function stepButton(step: PickerStep, direction: "previous" | "next") {
    const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="measurement-row:size-9 size-8"
        aria-label={step.ariaLabel}
        disabled={step.target === null}
        onClick={() => {
          setOpen(false);
          if (step.target !== null) {
            onChoose(step.target);
          }
        }}
      >
        <Icon aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div ref={fieldRef} className="relative z-20 w-auto min-w-0 flex-none">
      <div className="measurement-row:gap-2 flex min-w-0 items-center gap-1" role="group" aria-label={groupLabel}>
        {previous === undefined ? null : stepButton(previous, "previous")}
        <Button
          type="button"
          variant="outline"
          className="measurement-row:px-4 grid w-auto max-w-none min-w-0 flex-none shrink-0 overflow-visible px-2"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          disabled={options.length === 0}
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 flex items-center gap-2">
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
            <span className="text-center">{widestLabel}</span>
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
          </span>
          <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-center">{label}</span>
            <ChevronDown
              className={cn("measurement-row:inline hidden shrink-0", open && "rotate-180")}
              aria-hidden="true"
            />
          </span>
        </Button>
        {next === undefined ? null : stepButton(next, "next")}
      </div>
      {open ? (
        <div
          ref={listRef}
          className={cn(
            "bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md",
            scrolls && "max-h-57 overflow-x-hidden overflow-y-auto",
          )}
        >
          {options.map((option) => {
            const pressed = option.key === selectedKey;
            return (
              <Button
                key={option.key}
                type="button"
                variant={pressed ? "default" : "outline"}
                aria-pressed={pressed}
                onClick={() => {
                  setOpen(false);
                  onChoose(option.key);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
}

/** A chart tile's period row: the picker with previous/next arrows, then the Week/Month/Year/Years buttons. */
export default function ChartPeriodControls({
  period,
  anchor,
  days,
  today,
  onChoosePeriod,
  onChooseAnchor,
  extra,
}: Props) {
  let picker: ReactNode;
  if (period === "years") {
    // Years is fixed to the last five years: the same box, disabled, keeps the row from jumping.
    picker = (
      <PickerField
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
      <PickerField
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
