import { useEffect, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ERROR_TOAST_MS = 10000;

export function ErrorToastCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(ERROR_TOAST_MS / 1000);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 1 : current - 1));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <span className="text-muted-foreground text-xs tabular-nums" aria-hidden="true">
      ({secondsLeft} s)
    </span>
  );
}

export function ErrorToastCard({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="bg-background text-foreground border-border pointer-events-auto flex items-start gap-2 rounded-lg border p-4 shadow-lg"
    >
      <CircleAlert className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-destructive min-w-0 flex-1 text-sm">{message}</p>
      <div className="flex shrink-0 items-center gap-1">
        <ErrorToastCountdown />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Dismiss error"
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
