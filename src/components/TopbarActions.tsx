import { Button } from "@/components/ui/button";
import type { TopbarModel } from "@/lib/topbar";
import { cn } from "@/lib/utils";

type Props = TopbarModel;

export default function TopbarActions({ greeting, email, links, showSignOut }: Props) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center">
        {greeting != null || email != null ? (
          <span>
            {greeting}
            {greeting != null && email != null ? " " : null}
            {email}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {links.map((link) => (
          <Button key={link.id} variant="ghost" asChild>
            <a
              href={link.href}
              aria-current={link.current ? "page" : undefined}
              className={cn(link.current && "text-card-foreground font-semibold")}
            >
              {link.label}
            </a>
          </Button>
        ))}
        {showSignOut ? (
          <form method="POST" action="/api/auth/signout">
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
