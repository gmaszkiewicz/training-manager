import { useEffect, useRef, useState } from "react";
import { ErrorToastCard, ERROR_TOAST_MS } from "@/components/measurements/ErrorToastCard";

function restackPageErrorToasts() {
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

function PageErrorToast({ id, message, onDismiss }: { id: string; message: string; onDismiss: (id: string) => void }) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismissRef.current(id);
    }, ERROR_TOAST_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [id]);

  return (
    <ErrorToastCard
      message={message}
      onDismiss={() => {
        onDismiss(id);
      }}
    />
  );
}

export default function PageErrorToasts({
  messages,
  onDismiss,
}: {
  messages: string[];
  onDismiss?: (message: string) => void;
}) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);
  const items = messages.flatMap((message, index) => {
    const id = `page-error-${index}`;
    return dismissed.has(id) ? [] : [{ id, message }];
  });
  const toastIds = items.map((item) => item.id).join("\n");

  useEffect(() => {
    restackPageErrorToasts();
    return () => {
      requestAnimationFrame(restackPageErrorToasts);
    };
  }, [toastIds]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      data-error-toast-stack
      className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
    >
      {items.map((item) => (
        <PageErrorToast
          key={item.id}
          id={item.id}
          message={item.message}
          onDismiss={(id) => {
            const message = items.find((item) => item.id === id)?.message;
            setDismissed((current) => {
              if (current.has(id)) {
                return current;
              }
              const next = new Set(current);
              next.add(id);
              return next;
            });
            if (message !== undefined) {
              onDismissRef.current?.(message);
            }
          }}
        />
      ))}
    </div>
  );
}
