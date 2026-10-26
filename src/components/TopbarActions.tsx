import { Menu } from "lucide-react";
import { useCallback, useState } from "react";
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

// A plain img, not Radix AvatarImage: Radix renders the image only after hydration and its own
// load check, so every page load flashes the initials first. This img is server-rendered over
// the initials and hides itself when it fails, also when it failed before hydration.
function AccountImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const checkLoaded = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    return null;
  }

  return (
    <img
      ref={checkLoaded}
      src={src}
      alt=""
      data-slot="avatar-image"
      className="absolute inset-0 size-full rounded-full object-cover"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

function AccountMenu({ account }: { account: TopbarAccount }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label={account.label}>
          <Avatar>
            <AvatarFallback className="text-card-foreground font-semibold">{account.initials}</AvatarFallback>
            {account.imageUrl ? <AccountImage key={account.imageUrl} src={account.imageUrl} /> : null}
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

export default function TopbarActions({ greeting, name, links, account }: Props) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-w-0">
        {greeting != null || name != null ? (
          <span className="block truncate">
            {greeting}
            {greeting != null && name != null ? " " : null}
            {name}
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
