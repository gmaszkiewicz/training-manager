import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PageErrorToasts from "@/components/measurements/PageErrorToasts";
import TraineeRowLabel from "@/components/trainer/TraineeRowLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TraineeMatch } from "@/types";

const EMPTY_EMAIL_MESSAGE = "Enter an email address";
const NOT_CHOSEN_MESSAGE = "Choose a trainee from the list";

interface Props {
  idPrefix: string;
  placeholder?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalName(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isTraineeMatch(
  value: unknown,
): value is { email: string; firstName?: string | null; lastName?: string | null } {
  return (
    isRecord(value) &&
    typeof value.email === "string" &&
    isOptionalName(value.firstName) &&
    isOptionalName(value.lastName)
  );
}

function readTrainees(value: unknown): TraineeMatch[] {
  if (!isRecord(value) || !Array.isArray(value.trainees)) {
    return [];
  }
  const trainees: unknown[] = value.trainees;
  if (!trainees.every(isTraineeMatch)) {
    return [];
  }
  return trainees.map((trainee) => ({
    email: trainee.email,
    firstName: trainee.firstName ?? null,
    lastName: trainee.lastName ?? null,
  }));
}

function traineeSearchUrl(query: string): string {
  const params = new URLSearchParams();
  params.set("q", query);
  return `/api/trainer-links?${params.toString()}`;
}

async function fetchTrainees(query: string): Promise<TraineeMatch[]> {
  try {
    const response = await fetch(traineeSearchUrl(query), { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload: unknown = await response.json();
    return readTrainees(payload);
  } catch {
    return [];
  }
}

export default function TraineeEmailSearch({ idPrefix, placeholder = "Find trainee by email" }: Props) {
  const [email, setEmail] = useState("");
  const [matches, setMatches] = useState<TraineeMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  // The toast for a blocked submit: an empty field, or a typed name that is not an email.
  const [errorToast, setErrorToast] = useState<string | null>(null);
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
    void fetchTrainees(email).then((rows) => {
      if (!active || serial !== requestSerial.current) {
        return;
      }
      setMatches(rows);
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

  function clearError() {
    setInvalid(false);
    setErrorToast(null);
  }

  function onEmailChange(next: string) {
    chosenEmail.current = null;
    requestSerial.current += 1;
    setEmail(next);
    if (next.trim() === "") {
      setMatches([]);
      setOpen(false);
      return;
    }
    clearError();
  }

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    // A typed name is not sent: only an address, typed or filled in by choosing a match, reaches the server.
    function onSubmit(event: SubmitEvent) {
      const value = email.trim();
      if (value !== "" && value.includes("@")) {
        return;
      }
      event.preventDefault();
      setInvalid(true);
      setErrorToast(value === "" ? EMPTY_EMAIL_MESSAGE : NOT_CHOSEN_MESSAGE);
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
    void fetchTrainees(email).then((rows) => {
      if (serial !== requestSerial.current) {
        return;
      }
      setMatches(rows);
      setOpen(rows.length > 0);
    });
  }

  function choose(chosen: string) {
    chosenEmail.current = chosen;
    requestSerial.current += 1;
    setEmail(chosen);
    setMatches([]);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative z-40 mb-2">
      <div className="relative">
        <Input
          id={`${idPrefix}email`}
          name="email"
          type="text"
          autoComplete="off"
          aria-label="Trainee"
          aria-invalid={invalid ? true : undefined}
          placeholder={placeholder}
          className="pr-9"
          value={email}
          onFocus={reopenList}
          onPointerDown={reopenList}
          onChange={(event) => {
            onEmailChange(event.currentTarget.value);
          }}
        />
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        />
      </div>
      {open && matches.length > 0 ? (
        <div className="bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md">
          {matches.map((match) => (
            <Button
              key={match.email}
              type="button"
              variant="outline"
              className="h-auto w-full max-w-full min-w-0 shrink justify-start py-2"
              onClick={() => {
                choose(match.email);
              }}
            >
              <TraineeRowLabel
                className="w-full"
                email={match.email}
                firstName={match.firstName}
                lastName={match.lastName}
              />
            </Button>
          ))}
        </div>
      ) : null}
      {errorToast ? (
        <PageErrorToasts
          key={errorToast}
          portal
          messages={[errorToast]}
          onDismiss={() => {
            clearError();
          }}
        />
      ) : null}
    </div>
  );
}
