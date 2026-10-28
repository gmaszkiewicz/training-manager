import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Dashboard } from "@/types";

const textActionClassName = "text-primary focus-visible:ring-ring underline focus-visible:ring-2";

function subscribeToNothing(): () => void {
  return () => undefined;
}

interface Props {
  viewerRole: "trainer" | "trainee";
  otherId: string;
  name: string;
  dashboard: Dashboard;
  page: number;
}

// URL-driven confirmation (`?confirm=<id>&dashboard=<id>`), modelled on the Delete measurement toast.
export default function ConfirmRevokeToast({ viewerRole, otherId, name, dashboard, page }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!onClient) {
      return;
    }
    confirmRef.current?.focus();
  }, [otherId, onClient]);

  if (!onClient) {
    return null;
  }

  const trainer = viewerRole === "trainer";

  return createPortal(
    <div className="fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100%-2rem))]">
      <form
        method="POST"
        action="/api/collaborations/remove"
        role="alertdialog"
        aria-labelledby="confirm-revoke-toast"
        className="bg-background text-foreground border-border flex flex-col gap-3 rounded-lg border p-4 shadow-lg"
      >
        <p id="confirm-revoke-toast" className="text-sm">
          {trainer
            ? `Revoke your read access to ${name}'s measurements? You will no longer see their measurements.`
            : `Revoke ${name}'s read access to your measurements? They will no longer see your measurements.`}
        </p>
        <input type="hidden" name="other" value={otherId} />
        <input type="hidden" name="page" value={page} />
        <input type="hidden" name="intent" value="revoke" />
        <input type="hidden" name="dashboard" value={dashboard} />
        <div className="flex items-center gap-4">
          <Button ref={confirmRef} type="submit" size="sm">
            Revoke
          </Button>
          <a href={`/hub/collaborations?page=${page}`} className={textActionClassName}>
            Cancel
          </a>
        </div>
      </form>
    </div>,
    document.body,
  );
}
