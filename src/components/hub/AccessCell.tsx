import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accessLabel, accessSummary } from "@/lib/dashboards";
import type { DashboardAccess } from "@/types";

function subscribeToNothing(): () => void {
  return () => undefined;
}

// Each AccessCell is its own island, so the open dialog announces itself and the others close.
const ACCESS_DIALOG_OPEN = "access-dialog-open";

interface Props {
  dashboardLabel: string;
  name: string;
  entries: DashboardAccess[];
}

function AccessDialog({
  dashboardLabel,
  name,
  entries,
  triggerId,
  onClose,
}: Props & { triggerId: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const current = dialogRef.current;
    if (!onClient || current === null) {
      return;
    }
    const dialog: HTMLDialogElement = current;
    if (!dialog.open) {
      dialog.show();
    }
    const closeButton = dialog.querySelector("button");
    closeButton?.focus();
    document.dispatchEvent(new CustomEvent(ACCESS_DIALOG_OPEN, { detail: triggerId }));
    function onOtherOpen(event: Event) {
      if (event instanceof CustomEvent && event.detail !== triggerId) {
        dialog.close();
      }
    }
    function onDialogClose() {
      onCloseRef.current();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || dialog.contains(target)) {
        return;
      }
      // The trigger toggles the dialog itself.
      if (target instanceof Element && target.closest(`[data-access-trigger="${triggerId}"]`) !== null) {
        return;
      }
      event.preventDefault();
      dialog.close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dialog.close();
      }
    }
    dialog.addEventListener("close", onDialogClose);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener(ACCESS_DIALOG_OPEN, onOtherOpen);
    return () => {
      document.removeEventListener(ACCESS_DIALOG_OPEN, onOtherOpen);
      dialog.removeEventListener("close", onDialogClose);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [onClient, triggerId]);

  if (!onClient) {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="bg-background text-foreground border-border fixed inset-0 z-50 m-auto hidden h-fit max-h-[min(32rem,calc(100%-2rem))] w-[min(24rem,calc(100%-2rem))] max-w-none flex-col gap-3 rounded-lg border p-4 shadow-lg backdrop:bg-transparent open:flex"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={titleId} className="text-sm font-semibold">
            {dashboardLabel} access
          </p>
          <p className="text-muted-foreground truncate text-xs" title={name}>
            {name}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={`Close ${dashboardLabel} access for ${name}`}
          onClick={() => {
            dialogRef.current?.close();
          }}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <ul className="min-h-0 overflow-y-auto text-sm">
        {entries.map((entry, index) => (
          <li key={index}>{accessLabel(entry)}</li>
        ))}
      </ul>
    </dialog>,
    document.body,
  );
}

// One dashboard's access: the summary as text when it fits the cell, otherwise a KeyRound icon.
// Either way the button opens a dialog listing every entry. Modelled on the measurement Note cell.
export default function AccessCell({ dashboardLabel, name, entries }: Props) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground flex h-12 w-full items-center justify-center">{accessSummary(entries)}</div>
    );
  }

  const summary = accessSummary(entries);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="text-fit font-normal whitespace-normal"
        aria-label={`${dashboardLabel} access for ${name}: ${summary}`}
        aria-expanded={open}
        data-access-trigger={triggerId}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span className="text-fit-icon" aria-hidden="true">
          <KeyRound className="size-4" />
        </span>
        <span className="text-fit-text">{summary}</span>
      </Button>
      {open ? (
        <AccessDialog
          dashboardLabel={dashboardLabel}
          name={name}
          entries={entries}
          triggerId={triggerId}
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
