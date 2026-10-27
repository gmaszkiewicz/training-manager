import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageSizes } from "@/lib/measurement-page";
import { notificationMessage, notificationsPath } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationPage } from "@/types";

const textActionClassName = "text-primary focus-visible:ring-ring underline focus-visible:ring-2";

interface Props {
  page: NotificationPage;
  /** Preview only (kitchen sink): rows that start selected. */
  initialSelectedIds?: readonly string[];
  /** Preview only (kitchen sink): start with the delete confirmation open when something is selected. */
  initialConfirmOpen?: boolean;
}

// UTC, so the server render and the hydrated island print the same text.
function receivedDisplay(value: string): { day: string; time: string; text: string; dateTime: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: value, time: "", text: value, dateTime: value };
  }
  const iso = date.toISOString();
  const day = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  return { day, time, text: `${day} ${time}`, dateTime: iso };
}

function HiddenSelection({ ids, page }: { ids: readonly string[]; page: NotificationPage }) {
  return (
    <>
      {ids.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <input type="hidden" name="page" value={page.page} />
      <input type="hidden" name="size" value={page.size} />
    </>
  );
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

// Bottom-right toast like the Delete measurement and Remove collaboration confirmations.
function DeleteConfirmToast({
  ids,
  page,
  autoFocus,
  onCancel,
}: {
  ids: readonly string[];
  page: NotificationPage;
  autoFocus: boolean;
  onCancel: () => void;
}) {
  const deleteRef = useRef<HTMLButtonElement>(null);
  const onClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (onClient && autoFocus) {
      deleteRef.current?.focus();
    }
  }, [onClient, autoFocus]);

  if (!onClient) {
    return null;
  }

  return createPortal(
    <div className="fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100%-2rem))]">
      <form
        method="POST"
        action="/api/notifications/delete"
        role="alertdialog"
        aria-labelledby="confirm-delete-notifications"
        className="bg-background text-foreground border-border flex flex-col gap-3 rounded-lg border p-4 shadow-lg"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
      >
        <p id="confirm-delete-notifications" className="text-sm">
          {ids.length === 1 ? "Delete 1 notification for good?" : `Delete ${ids.length} notifications for good?`}
        </p>
        <HiddenSelection ids={ids} page={page} />
        <div className="flex items-center gap-4">
          <Button ref={deleteRef} type="submit" size="sm">
            Delete
          </Button>
          <button type="button" className={textActionClassName} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function NotificationRow({
  notification,
  page,
  selected,
  onSelectedChange,
}: {
  notification: AppNotification;
  page: NotificationPage;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const received = receivedDisplay(notification.createdAt);
  const unread = notification.readAt === null;

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="w-10 px-0 text-center">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => {
            onSelectedChange(checked === true);
          }}
          aria-label={`Select notification from ${received.text}`}
        />
      </TableCell>
      <TableCell className="px-2 py-2 whitespace-normal">
        <form method="POST" action="/api/notifications/open" className="flex items-start gap-2">
          <input type="hidden" name="id" value={notification.id} />
          <input type="hidden" name="page" value={page.page} />
          <input type="hidden" name="size" value={page.size} />
          <span
            aria-hidden="true"
            className={cn("bg-primary mt-1.5 size-2 shrink-0 rounded-full", !unread && "invisible")}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <Button
              type="submit"
              variant="link"
              className={cn(
                "h-auto min-w-0 justify-start p-0 text-left break-words whitespace-normal",
                unread ? "text-foreground font-semibold" : "text-muted-foreground font-normal",
              )}
            >
              {notificationMessage(notification)}
            </Button>
            {/* Narrow lists drop the Received and Status columns; the same facts sit under the message. */}
            <p className="text-muted-foreground text-xs @lg:hidden">
              <time dateTime={received.dateTime}>{received.text}</time> · {unread ? "Unread" : "Read"}
            </p>
          </div>
        </form>
      </TableCell>
      <TableCell className="text-muted-foreground hidden w-24 px-2 py-2 text-center @lg:table-cell">
        <time dateTime={received.dateTime} className="block">
          <span className="block">{received.day}</span>
          <span className="block">{received.time}</span>
        </time>
      </TableCell>
      <TableCell
        className={cn(
          "hidden w-16 px-2 py-2 text-center @lg:table-cell",
          unread ? "text-foreground font-semibold" : "text-muted-foreground",
        )}
      >
        {unread ? "Unread" : "Read"}
      </TableCell>
    </TableRow>
  );
}

export default function NotificationsTable({ page, initialSelectedIds = [], initialConfirmOpen = false }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedIds.filter((id) => page.rows.some((row) => row.id === id))),
  );
  const [confirmOpen, setConfirmOpen] = useState(initialConfirmOpen);
  // Set by the Delete click, so a preview that starts open does not steal focus on load.
  const [focusConfirm, setFocusConfirm] = useState(false);

  const visibleSelected = page.rows.filter((row) => selectedIds.has(row.id)).map((row) => row.id);
  const selectedCount = visibleSelected.length;
  const allVisibleSelected = page.rows.length > 0 && selectedCount === page.rows.length;
  const headerChecked = allVisibleSelected ? true : selectedCount > 0 ? "indeterminate" : false;
  const confirmShown = confirmOpen && selectedCount > 0;

  function setVisibleSelected(selected: boolean): void {
    setSelectedIds(selected ? new Set(page.rows.map((row) => row.id)) : new Set());
  }

  function setRowSelected(id: string, selected: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <form method="POST" action="/api/notifications/read">
          <HiddenSelection ids={visibleSelected} page={page} />
          <Button type="submit" variant="outline" size="sm" disabled={selectedCount === 0}>
            Mark as read
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selectedCount === 0}
          onClick={() => {
            setFocusConfirm(true);
            setConfirmOpen(true);
          }}
        >
          Delete
        </Button>
        <form method="GET" action="/hub/notifications" className="ml-auto">
          <input type="hidden" name="page" value={1} />
          <div className="flex gap-1" role="group" aria-label="Entries per page">
            {pageSizes.map((size) => (
              <Button
                key={size}
                type="submit"
                name="size"
                value={size}
                variant={page.size === size ? "default" : "outline"}
                className="min-w-8 px-2"
                aria-pressed={page.size === size}
              >
                {size}
              </Button>
            ))}
          </div>
        </form>
      </div>
      {confirmShown ? (
        <DeleteConfirmToast
          ids={visibleSelected}
          page={page}
          autoFocus={focusConfirm}
          onCancel={() => {
            setConfirmOpen(false);
          }}
        />
      ) : null}
      {page.rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No notifications</p>
      ) : (
        <div className="border-border bg-background @container w-full max-w-full min-w-0 overflow-hidden rounded-md border">
          {/* Fixed layout: Received and Status keep their width; a long message wraps instead of pushing them out. */}
          <Table containerClassName="overflow-x-clip" className="table-fixed">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-10 px-0 text-center">
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={(checked) => {
                      setVisibleSelected(checked === true);
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="px-2">Notification</TableHead>
                <TableHead className="hidden w-24 px-2 text-center @lg:table-cell">Received</TableHead>
                <TableHead className="hidden w-16 px-2 text-center @lg:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  page={page}
                  selected={selectedIds.has(notification.id)}
                  onSelectedChange={(selected) => {
                    setRowSelected(notification.id, selected);
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {page.pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          {page.page > 1 ? (
            <a
              href={notificationsPath({ page: page.page - 1, size: page.size })}
              className={buttonVariants({ variant: "outline", size: "icon" })}
              aria-label="Previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </a>
          ) : (
            <Button type="button" variant="outline" size="icon" aria-label="Previous page" disabled>
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
          <p>
            Page {page.page} of {page.pageCount}
          </p>
          {page.page < page.pageCount ? (
            <a
              href={notificationsPath({ page: page.page + 1, size: page.size })}
              className={buttonVariants({ variant: "outline", size: "icon" })}
              aria-label="Next page"
            >
              <ChevronRight aria-hidden="true" />
            </a>
          ) : (
            <Button type="button" variant="outline" size="icon" aria-label="Next page" disabled>
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
