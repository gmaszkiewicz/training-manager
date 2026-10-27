import { useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TopbarNotifications } from "@/lib/topbar";

interface Props {
  notifications: TopbarNotifications;
}

// UTC, so the server render and the hydrated island print the same text.
function receivedDisplay(value: string): { text: string; dateTime: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { text: value, dateTime: value };
  }
  const iso = date.toISOString();
  return { text: `${iso.slice(0, 10)} ${iso.slice(11, 16)}`, dateTime: iso };
}

function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

// The menu content is portaled, so each item submits a hidden form rendered next to the trigger.
export default function NotificationBell({ notifications }: Props) {
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);

  return (
    <>
      {notifications.items.map((item, index) => (
        <form
          key={item.id}
          ref={(form) => {
            formRefs.current[index] = form;
          }}
          method="POST"
          action="/api/notifications/open"
          hidden
        >
          <input type="hidden" name="id" value={item.id} />
        </form>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative shrink-0"
            aria-label={`Notifications, ${notifications.unreadCount} unread`}
          >
            <Bell aria-hidden="true" />
            {notifications.unreadCount > 0 ? (
              <span
                aria-hidden="true"
                className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs leading-none font-semibold"
              >
                {badgeText(notifications.unreadCount)}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-xs">
          {notifications.items.map((item, index) => {
            const received = receivedDisplay(item.createdAt);
            return (
              <DropdownMenuItem
                key={item.id}
                className="flex flex-col items-start gap-1"
                onSelect={() => {
                  formRefs.current[index]?.requestSubmit();
                }}
              >
                <span className="text-foreground whitespace-normal">{item.message}</span>
                <time dateTime={received.dateTime} className="text-muted-foreground text-xs">
                  {received.text}
                </time>
              </DropdownMenuItem>
            );
          })}
          {notifications.items.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem asChild>
            <a href={notifications.allHref}>See all notifications</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
