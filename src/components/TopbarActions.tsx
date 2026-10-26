import { Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TopbarAccount, TopbarLink, TopbarModel } from "@/lib/topbar";
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

function AccountMenu({ account }: { account: TopbarAccount }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label={account.label}>
          <Avatar>
            <AvatarFallback className="text-card-foreground font-semibold">{account.initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {account.items.map((item) => (
          <DropdownMenuItem key={item.id} asChild>
            <a
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={linkClassName(item.current)}
            >
              {item.label}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form method="POST" action="/api/auth/signout">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TopbarActions({ greeting, email, links, account }: Props) {
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
      <div className="flex shrink-0 items-center gap-3">
        <div className="measurement-row:flex hidden flex-wrap items-center gap-3">
          {links.map((link) => (
            <NavLink key={link.id} link={link} />
          ))}
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
          </DropdownMenuContent>
        </DropdownMenu>
        {account ? <AccountMenu account={account} /> : null}
      </div>
    </div>
  );
}
