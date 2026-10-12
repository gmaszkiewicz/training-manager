import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adjacentTrainerLinks, type TrainerLink } from "@/lib/trainer-preview";
import { cn } from "@/lib/utils";

interface Props {
  links: readonly TrainerLink[];
  selectedTraineeId: string;
}

function traineeMeasurementsHref(traineeId: string): string {
  return `/measurements?trainee=${encodeURIComponent(traineeId)}`;
}

export default function LinkedTraineeField({ links, selectedTraineeId }: Props) {
  const selected = links.find((link) => link.traineeId === selectedTraineeId) ?? null;
  const { previous, next } = adjacentTrainerLinks(links, selectedTraineeId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listScrolls = links.length > 6;

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
      if (!(target instanceof Node) || rootRef.current?.contains(target)) {
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
    if (!open || !listScrolls) {
      return;
    }
    const container = listRef.current;
    const selectedRow = container?.querySelector<HTMLElement>("[aria-current='page']");
    if (container === null || selectedRow === null || selectedRow === undefined) {
      return;
    }
    const nextTop = selectedRow.offsetTop - container.clientHeight / 2 + selectedRow.clientHeight / 2;
    container.scrollTop = Math.max(0, nextTop);
  }, [open, listScrolls, selectedTraineeId]);

  if (selected === null) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative z-20 w-max">
      <div className="flex items-center gap-2" role="group" aria-label="Linked trainees">
        {previous === null ? (
          <Button type="button" variant="outline" size="icon" aria-label="Previous trainee" disabled>
            <ChevronLeft aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon" aria-label="Previous trainee">
            <a href={traineeMeasurementsHref(previous.traineeId)}>
              <ChevronLeft aria-hidden="true" />
            </a>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="grid"
          aria-expanded={open}
          aria-label={selected.email}
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 grid">
            {links.map((link) => (
              <span key={link.traineeId} className="col-start-1 row-start-1">
                {link.email}
              </span>
            ))}
          </span>
          <span className="col-start-1 row-start-1 text-center">{selected.email}</span>
        </Button>
        {next === null ? (
          <Button type="button" variant="outline" size="icon" aria-label="Next trainee" disabled>
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon" aria-label="Next trainee">
            <a href={traineeMeasurementsHref(next.traineeId)}>
              <ChevronRight aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>
      {open ? (
        <div
          ref={listRef}
          className={cn(
            "bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md",
            listScrolls && "max-h-68 overflow-x-hidden overflow-y-auto",
          )}
        >
          {links.map((link) => {
            const current = link.traineeId === selected.traineeId;
            return (
              <Button key={link.traineeId} asChild variant={current ? "default" : "outline"}>
                <a href={traineeMeasurementsHref(link.traineeId)} aria-current={current ? "page" : undefined}>
                  {link.email}
                </a>
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
