import { useEffect, useRef, useState } from "react";
import PageErrorToasts from "@/components/measurements/PageErrorToasts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMPTY_EMAIL_MESSAGE = "Enter an email address";

interface Props {
  idPrefix: string;
  serverError?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function readEmails(value: unknown): string[] {
  if (!isRecord(value) || !isStringArray(value.emails)) {
    return [];
  }
  return value.emails;
}

function traineeSearchUrl(query: string): string {
  const params = new URLSearchParams();
  params.set("q", query);
  return `/api/trainer-links?${params.toString()}`;
}

async function fetchTraineeEmails(query: string): Promise<string[]> {
  try {
    const response = await fetch(traineeSearchUrl(query), { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload: unknown = await response.json();
    return readEmails(payload);
  } catch {
    return [];
  }
}

export default function TraineeEmailSearch({ idPrefix, serverError = null }: Props) {
  const arrivedEmpty = serverError === EMPTY_EMAIL_MESSAGE;
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(arrivedEmpty);
  const [emptyToast, setEmptyToast] = useState(arrivedEmpty);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestSerial = useRef(0);
  // The address written by choosing a row. That write must not search again.
  const chosenEmail = useRef<string | null>(null);

  useEffect(() => {
    if (chosenEmail.current === email) {
      return;
    }
    const query = email.trim();
    if (query === "") {
      return;
    }
    const serial = ++requestSerial.current;
    let active = true;
    void fetchTraineeEmails(email).then((rows) => {
      if (!active || serial !== requestSerial.current) {
        return;
      }
      setEmails(rows);
      setOpen(rows.length > 0);
    });
    return () => {
      active = false;
    };
  }, [email]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeList() {
      requestSerial.current += 1;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeList();
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) {
        return;
      }
      closeList();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function clearEmptyError() {
    setInvalid(false);
    setEmptyToast(false);
  }

  function onEmailChange(next: string) {
    chosenEmail.current = null;
    requestSerial.current += 1;
    setEmail(next);
    if (next.trim() === "") {
      setEmails([]);
      setOpen(false);
      return;
    }
    clearEmptyError();
  }

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    function onSubmit(event: SubmitEvent) {
      if (email.trim() !== "") {
        return;
      }
      event.preventDefault();
      setInvalid(true);
      setEmptyToast(true);
    }
    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("submit", onSubmit);
    };
  }, [email]);

  function reopenList() {
    if (email.trim() === "") {
      return;
    }
    const serial = ++requestSerial.current;
    void fetchTraineeEmails(email).then((rows) => {
      if (serial !== requestSerial.current) {
        return;
      }
      setEmails(rows);
      setOpen(rows.length > 0);
    });
  }

  function choose(chosen: string) {
    chosenEmail.current = chosen;
    requestSerial.current += 1;
    setEmail(chosen);
    setEmails([]);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative z-40 mb-2">
      <Input
        id={`${idPrefix}email`}
        name="email"
        type="text"
        inputMode="email"
        autoComplete="off"
        aria-label="Email"
        aria-invalid={invalid ? true : undefined}
        placeholder="Find trainee by email"
        value={email}
        onFocus={reopenList}
        onPointerDown={reopenList}
        onChange={(event) => {
          onEmailChange(event.currentTarget.value);
        }}
      />
      {open && emails.length > 0 ? (
        <div className="bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md">
          {emails.map((match) => (
            <Button
              key={match}
              type="button"
              variant="outline"
              className="w-full max-w-full min-w-0 shrink"
              onClick={() => {
                choose(match);
              }}
            >
              <span className="min-w-0 truncate">{match}</span>
            </Button>
          ))}
        </div>
      ) : null}
      {emptyToast ? (
        <PageErrorToasts
          messages={[EMPTY_EMAIL_MESSAGE]}
          onDismiss={() => {
            clearEmptyError();
          }}
        />
      ) : null}
    </div>
  );
}
