import type { MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const PREVIEW_BADGE_LABEL = "Preview";
export const PREVIEW_BADGE_TOOLTIP = "Preview version — it may contain bugs.";

// The badge sits inside the tile's <summary>: a click on it must not toggle the <details>.
function keepTileOpenState(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
  event.stopPropagation();
}

/** The red "Preview" mark next to a tile title, with its warning on hover and keyboard focus. */
export default function PreviewBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge asChild variant="destructive">
            <button type="button" data-preview-badge onClick={keepTileOpenState}>
              {PREVIEW_BADGE_LABEL}
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{PREVIEW_BADGE_TOOLTIP}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
