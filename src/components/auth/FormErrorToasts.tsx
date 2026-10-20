import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ERROR_TOAST_MS, ErrorToastCard } from "@/components/measurements/ErrorToastCard";

export interface FormErrorItem {
  id: string;
  message: string;
  tone?: "error" | "notice";
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function restackErrorToasts() {
  const nodes = [...document.querySelectorAll<HTMLElement>("[data-error-toast-stack]")];
  let bottom = 16;
  for (const node of nodes) {
    if (node.childElementCount === 0) {
      continue;
    }
    node.style.bottom = `${bottom}px`;
    bottom += node.getBoundingClientRect().height + 8;
  }
}

export function formErrorItems(
  errors: Partial<Record<string, string>>,
  dismissed: ReadonlySet<string>,
  serverMessage: string | null,
  noticeMessage: string | null = null,
): FormErrorItem[] {
  const items: FormErrorItem[] = [];
  for (const [field, message] of Object.entries(errors)) {
    if (message === undefined) {
      continue;
    }
    const id = `${field}-error`;
    if (!dismissed.has(id)) {
      items.push({ id, message });
    }
  }
  if (serverMessage !== null && !dismissed.has("server-error")) {
    items.push({ id: "server-error", message: serverMessage });
  }
  if (noticeMessage !== null && !dismissed.has("notice")) {
    items.push({ id: "notice", message: noticeMessage, tone: "notice" });
  }
  return items;
}

export function useFormErrors<Field extends string>(
  serverError?: string | null,
  initialErrors: Partial<Record<Field, string>> = {},
  notice?: string | null,
  initialHighlighted: readonly Field[] = [],
) {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>(initialErrors);
  const [serverMessage, setServerMessage] = useState<string | null>(serverError ?? null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(notice ?? null);
  const [highlighted, setHighlighted] = useState<ReadonlySet<Field>>(() => new Set(initialHighlighted));
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const items = formErrorItems(errors, dismissed, serverMessage, noticeMessage);

  function dismiss(id: string) {
    setDismissed((current) => {
      if (current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.add(id);
      return next;
    });
    if (id === "server-error") {
      setServerMessage(null);
      setHighlighted(new Set());
      return;
    }
    if (id === "notice") {
      setNoticeMessage(null);
      return;
    }
    const field = id.slice(0, -"-error".length) as Field;
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      return { ...current, [field]: undefined };
    });
  }

  function clearField(field: Field) {
    const id = `${field}-error`;
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      return { ...current, [field]: undefined };
    });
    setDismissed((current) => {
      if (!current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setHighlighted((current) => {
      if (!current.has(field)) {
        return current;
      }
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  }

  function showErrors(next: Partial<Record<Field, string>>) {
    setErrors(next);
    setHighlighted(new Set());
    setDismissed((current) => {
      const kept = new Set<string>();
      if (current.has("server-error")) {
        kept.add("server-error");
      }
      if (current.has("notice")) {
        kept.add("notice");
      }
      return kept;
    });
  }

  function reportServerError(message: string, field?: Field | readonly Field[]) {
    const fields: readonly Field[] = field === undefined ? [] : typeof field === "string" ? [field] : field;
    if (fields.length > 1) {
      setErrors({});
      setServerMessage(message);
      setHighlighted(new Set(fields));
      setDismissed((current) => {
        const next = new Set(current);
        next.delete("server-error");
        for (const name of fields) {
          next.delete(`${name}-error`);
        }
        return next;
      });
      return;
    }
    setHighlighted(new Set());
    if (fields.length === 1) {
      const only = fields[0];
      setErrors((current) => ({ ...current, [only]: message }));
      setServerMessage(null);
      setDismissed((current) => {
        const next = new Set(current);
        next.delete(`${only}-error`);
        next.add("server-error");
        return next;
      });
      return;
    }
    setDismissed((current) => {
      if (!current.has("server-error")) {
        return current;
      }
      const next = new Set(current);
      next.delete("server-error");
      return next;
    });
    setServerMessage(message);
  }

  function fieldInvalid(field: Field) {
    if (errors[field] !== undefined && !dismissed.has(`${field}-error`)) {
      return true;
    }
    return highlighted.has(field) && serverMessage !== null && !dismissed.has("server-error");
  }

  function describedBy(field: Field) {
    if (!fieldInvalid(field)) {
      return undefined;
    }
    if (errors[field] !== undefined && !dismissed.has(`${field}-error`)) {
      return `${field}-error`;
    }
    return "server-error";
  }

  return { errors, items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy };
}

export function FormErrorToasts({ items, onDismiss }: { items: FormErrorItem[]; onDismiss: (id: string) => void }) {
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const timers = useRef(new Map<string, number>());
  const onDismissRef = useRef(onDismiss);
  const toastIds = items.map((item) => item.id).join("\n");

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const visible = new Set(toastIds.length === 0 ? [] : toastIds.split("\n"));
    for (const [id, timer] of timers.current) {
      if (!visible.has(id)) {
        window.clearTimeout(timer);
        timers.current.delete(id);
      }
    }
    for (const id of visible) {
      if (timers.current.has(id)) {
        continue;
      }
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          onDismissRef.current(id);
        }, ERROR_TOAST_MS),
      );
    }
  }, [toastIds]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) {
        window.clearTimeout(timer);
      }
      active.clear();
    };
  }, []);

  useEffect(() => {
    restackErrorToasts();
    return () => {
      requestAnimationFrame(restackErrorToasts);
    };
  }, [toastIds]);

  if (!onClient || items.length === 0) {
    return null;
  }

  return createPortal(
    <div
      data-error-toast-stack
      className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
    >
      {items.map((item) => (
        <div key={item.id} id={item.id}>
          <ErrorToastCard
            message={item.message}
            tone={item.tone}
            onDismiss={() => {
              onDismiss(item.id);
            }}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
