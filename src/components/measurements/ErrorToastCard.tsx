import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function ErrorToastCard({
  message,
  onDismiss,
  tone = "error",
}: {
  message: string;
  onDismiss: () => void;
  tone?: "error" | "notice";
}) {
  const notice = tone === "notice";

  return (
    <div
      role="status"
      className="bg-background text-foreground border-border pointer-events-auto flex items-start gap-2 rounded-lg border p-4 shadow-lg"
    >
      {notice ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CircleAlert className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <p className={cn("min-w-0 flex-1 text-sm", notice ? "text-foreground" : "text-destructive")}>{message}</p>
      <div className="flex shrink-0 items-center gap-1">
        <ErrorToastCountdown />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={notice ? "Dismiss notice" : "Dismiss error"}
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
