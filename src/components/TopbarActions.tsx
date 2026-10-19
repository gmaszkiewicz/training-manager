import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TopbarLink, TopbarModel } from "@/lib/topbar";
import { cn } from "@/lib/utils";

type Props = TopbarModel;

function linkClassName(current: boolean): string | undefined {
  return cn(current && "text-card-foreground font-semibold");
}

function NavLink({ link }: { link: TopbarLink }) {
  return (
    <Button variant="ghost" asChild>
      <a href={link.href} aria-current={link.current ? "page" : undefined} className={linkClassName(link.current)}>
        {link.label}
      </a>
    </Button>
  );
}

export default function TopbarActions({ greeting, email, links, showSignOut }: Props) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-w-0">
        {greeting != null || email != null ? (
          <span className="block truncate">
            {greeting}
            {greeting != null && email != null ? " " : null}
            {email}
          </span>
        ) : null}
      </div>
      <div className="measurement-row:flex hidden flex-wrap items-center gap-3">
        {links.map((link) => (
          <NavLink key={link.id} link={link} />
        ))}
        {showSignOut ? (
          <form method="POST" action="/api/auth/signout">
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="measurement-row:hidden shrink-0"
            aria-label="Menu"
          >
            <Menu aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {links.map((link) => (
            <DropdownMenuItem key={link.id} asChild>
              <a
                href={link.href}
                aria-current={link.current ? "page" : undefined}
                className={linkClassName(link.current)}
              >
                {link.label}
              </a>
            </DropdownMenuItem>
          ))}
          {showSignOut ? (
            <form method="POST" action="/api/auth/signout">
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
