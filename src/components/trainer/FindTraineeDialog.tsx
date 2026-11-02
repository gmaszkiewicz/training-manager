import { Search } from "lucide-react";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import PageErrorToasts from "@/components/measurements/PageErrorToasts";
import TraineeEmailSearch from "@/components/trainer/TraineeEmailSearch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { requestFailedMessage } from "@/lib/collaborations";
import {
  canRequestAccess,
  findTraineeDescription,
  findTraineePlaceholder,
  findTraineeTitle,
  findTraineeTriggerLabel,
  readRequestAnswer,
  requestAccessLabel,
  requestForLabel,
  requestForOptions,
  type RequestAnswer,
} from "@/lib/find-trainee";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/types";

const ID_PREFIX = "find-trainee-";

// Resolves to null when the request was aborted because the dialog closed.
async function sendRequest(form: HTMLFormElement, signal: AbortSignal): Promise<RequestAnswer | null> {
  try {
    const response = await fetch("/api/trainer-links", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
      cache: "no-store",
      signal,
    });
    const payload: unknown = await response.json();
    return signal.aborted ? null : readRequestAnswer(payload);
  } catch {
    return signal.aborted ? null : { kind: "error", message: requestFailedMessage };
  }
}

// Mounted only while the dialog is open, so every reopen starts from an empty email and Measurements checked.
function FindTraineeForm({ onSent }: { onSent: (message: string) => void }) {
  const [selected, setSelected] = useState<Dashboard[]>(["measurements"]);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<{ id: number; message: string } | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // A late answer must not act on a dialog that was closed (and maybe reopened) meanwhile.
  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  function toggle(id: Dashboard, checked: boolean) {
    setSelected((current) => {
      const without = current.filter((item) => item !== id);
      return checked ? [...without, id] : without;
    });
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    // The trainee search prevents an empty submit, or a typed name without "@", itself and shows its own toast.
    if (event.nativeEvent.defaultPrevented) {
      return;
    }
    event.preventDefault();
    if (sending || !canRequestAccess(selected)) {
      return;
    }
    const form = event.currentTarget;
    setSending(true);
    setFailed(null);
    const controller = new AbortController();
    requestRef.current = controller;
    void sendRequest(form, controller.signal).then((answer) => {
      if (answer === null) {
        return;
      }
      setSending(false);
      if (answer.kind === "sent") {
        onSent(answer.message);
        return;
      }
      setFailed((current) => ({ id: (current?.id ?? 0) + 1, message: answer.message }));
    });
  }

  return (
    <form method="post" action="/api/trainer-links" noValidate className="flex flex-col gap-4" onSubmit={onSubmit}>
      <TraineeEmailSearch idPrefix={ID_PREFIX} placeholder={findTraineePlaceholder} />
      {/* Two columns, row by row in dashboard order: Measurements | Nutrition, then Training | Planning. */}
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-3 text-sm font-medium">{requestForLabel}</legend>
        {requestForOptions().map((option) => {
          const id = `${ID_PREFIX}dashboard-${option.id}`;
          return (
            <div key={option.id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                name="dashboards"
                value={option.id}
                disabled={!option.enabled}
                checked={option.enabled && selected.includes(option.id)}
                onCheckedChange={(checked) => {
                  toggle(option.id, checked === true);
                }}
              />
              <Label htmlFor={id} className={cn(!option.enabled && "text-muted-foreground")}>
                {option.label}
              </Label>
            </div>
          );
        })}
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={!canRequestAccess(selected) || sending}>
          {requestAccessLabel}
        </Button>
      </div>
      {/* Like every error in the app, not found, pending, granted and failed answers are toasts. Portaled out of the
          dialog's transform to the bottom corner of the screen; the dialog stays open and the toast goes with it. */}
      {failed ? (
        <PageErrorToasts
          key={failed.id}
          portal
          messages={[failed.message]}
          onDismiss={() => {
            setFailed(null);
          }}
        />
      ) : null}
    </form>
  );
}

// Error toasts raised from the dialog are portaled to the body; a click on one is not a click outside the dialog.
function keepOpenOnToast(event: { target: EventTarget | null; preventDefault: () => void }) {
  if (event.target instanceof Element && event.target.closest("[data-error-toast-stack]")) {
    event.preventDefault();
  }
}

interface Props {
  /** Hides the trigger's text label, leaving the magnifier and its accessible name. */
  compactLabel?: boolean;
}

export default function FindTraineeDialog({ compactLabel = false }: Props) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<{ id: number; message: string } | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={findTraineeTriggerLabel}
            data-find-trainee-trigger
            className="text-muted-foreground min-w-0 justify-start"
          >
            <Search aria-hidden="true" />
            {/* Inside the top bar's left slot (a container), the label hides when the slot is narrower than the token. */}
            <span data-find-trainee-label className={cn("@max-find-trainee:hidden truncate", compactLabel && "hidden")}>
              {findTraineeTriggerLabel}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent onPointerDownOutside={keepOpenOnToast} onInteractOutside={keepOpenOnToast}>
          <DialogHeader>
            <DialogTitle>{findTraineeTitle}</DialogTitle>
            <DialogDescription>{findTraineeDescription}</DialogDescription>
          </DialogHeader>
          <FindTraineeForm
            onSent={(message) => {
              setOpen(false);
              setSent((current) => ({ id: (current?.id ?? 0) + 1, message }));
            }}
          />
        </DialogContent>
      </Dialog>
      {sent ? (
        <PageErrorToasts
          key={sent.id}
          messages={[sent.message]}
          tone="notice"
          onDismiss={() => {
            setSent(null);
          }}
        />
      ) : null}
    </>
  );
}
