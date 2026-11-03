import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PeriodPickerOption {
  key: string;
  label: string;
}

export interface PeriodPickerStep {
  ariaLabel: string;
  target: string | null;
}

/** How many choices the list shows before it scrolls, with the height that fits them. */
const listHeightClass = {
  5: "max-h-57",
  6: "max-h-68",
} as const;

interface Props {
  groupLabel: string;
  label: string;
  ariaLabel?: string;
  /** Sets the box width; a longer `label` truncates inside it. */
  widestLabel: string;
  options: PeriodPickerOption[];
  selectedKey: string;
  previous?: PeriodPickerStep;
  next?: PeriodPickerStep;
  onChoose: (key: string) => void;
  /** The list scrolls once it holds more choices than this. */
  listRows?: keyof typeof listHeightClass;
}

/**
 * The period picker shared by the measurements tiles: optional previous/next arrows around a button that opens a
 * list of choices. An invisible widest label fixes the button's width, so a longer label truncates instead of
 * stretching it.
 */
export default function PeriodPicker({
  groupLabel,
  label,
  ariaLabel,
  widestLabel,
  options,
  selectedKey,
  previous,
  next,
  onChoose,
  listRows = 5,
}: Props) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrolls = options.length > listRows;

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

  function stepButton(step: PeriodPickerStep, direction: "previous" | "next") {
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
          {/* The sizer alone sets the column width: the visible label adds no width of its own and fills the column. */}
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 flex items-center gap-2">
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
            <span className="text-center">{widestLabel}</span>
            <ChevronDown className="measurement-row:inline invisible hidden shrink-0" aria-hidden="true" />
          </span>
          <span className="col-start-1 row-start-1 flex w-0 min-w-full items-center gap-2">
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
            scrolls && listHeightClass[listRows],
            scrolls && "overflow-x-hidden overflow-y-auto",
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
