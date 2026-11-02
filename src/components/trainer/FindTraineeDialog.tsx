import { Search } from "lucide-react";
import { useState, type SubmitEvent } from "react";
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

async function sendRequest(form: HTMLFormElement): Promise<RequestAnswer> {
  try {
    const response = await fetch("/api/trainer-links", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
      cache: "no-store",
    });
    const payload: unknown = await response.json();
    return readRequestAnswer(payload);
  } catch {
    return { kind: "error", message: requestFailedMessage };
  }
}

// Mounted only while the dialog is open, so every reopen starts from an empty email and Measurements checked.
function FindTraineeForm({
  onSent,
  onFailed,
}: {
  onSent: (message: string) => void;
  onFailed: (message: string | null) => void;
}) {
  const [selected, setSelected] = useState<Dashboard[]>(["measurements"]);
  const [sending, setSending] = useState(false);

  function toggle(id: Dashboard, checked: boolean) {
    setSelected((current) => {
      const without = current.filter((item) => item !== id);
      return checked ? [...without, id] : without;
    });
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    // The email search prevents an empty submit itself and shows its own "Enter an email address" toast.
    if (event.nativeEvent.defaultPrevented) {
      return;
    }
    event.preventDefault();
    if (sending || !canRequestAccess(selected)) {
      return;
    }
    const form = event.currentTarget;
    setSending(true);
    onFailed(null);
    void sendRequest(form).then((answer) => {
      setSending(false);
      if (answer.kind === "sent") {
        onSent(answer.message);
        return;
      }
      onFailed(answer.message);
    });
  }

  return (
    <form method="post" action="/api/trainer-links" noValidate className="flex flex-col gap-4" onSubmit={onSubmit}>
      <TraineeEmailSearch idPrefix={ID_PREFIX} placeholder={findTraineePlaceholder} />
      <fieldset className="flex flex-col gap-3">
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
    </form>
  );
}

interface Props {
  /** Hides the trigger's text label, leaving the magnifier and its accessible name. */
  compactLabel?: boolean;
}

export default function FindTraineeDialog({ compactLabel = false }: Props) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<{ id: number; message: string } | null>(null);
  const [failed, setFailed] = useState<{ id: number; message: string } | null>(null);

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{findTraineeTitle}</DialogTitle>
            <DialogDescription>{findTraineeDescription}</DialogDescription>
          </DialogHeader>
          <FindTraineeForm
            onSent={(message) => {
              setOpen(false);
              setSent((current) => ({ id: (current?.id ?? 0) + 1, message }));
            }}
            onFailed={(message) => {
              setFailed((current) => (message === null ? null : { id: (current?.id ?? 0) + 1, message }));
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
      {/* Raised while the modal is open, so portaled: clickable over the dialog and in the bottom corner of the screen. */}
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
    </>
  );
}
