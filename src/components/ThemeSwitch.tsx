import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseThemePreference } from "@/lib/theme";

/** Light, Dark and System, wired to the stored preference; rendered by the guest button and the avatar menu. */
export function ThemeRadioItems() {
  const { preference, setPreference } = useTheme();

  return (
    <DropdownMenuRadioGroup
      value={preference ?? ""}
      onValueChange={(value) => {
        setPreference(parseThemePreference(value));
      }}
    >
      <DropdownMenuRadioItem value="light">
        <Sun aria-hidden="true" />
        Light
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">
        <Moon aria-hidden="true" />
        Dark
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system">
        <Monitor aria-hidden="true" />
        System
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}

/** Sun in light, Moon in dark, from the `.dark` class rather than React state. */
export function ThemeIcon() {
  return (
    <>
      <Sun aria-hidden="true" className="dark:hidden" />
      <Moon aria-hidden="true" className="hidden dark:block" />
    </>
  );
}

// The trigger icon follows the `.dark` class set before paint, never React state, so the server render and the
// hydrated island match; the radio selection is read from storage only after mount.
export default function ThemeSwitch() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Theme">
          <ThemeIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeRadioItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
