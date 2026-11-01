import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const PREVIEW_BADGE_LABEL = "Preview";
export const PREVIEW_BADGE_TOOLTIP = "Preview version — it may contain bugs.";

/** The red "Preview" mark in a tile header, with its warning on hover and keyboard focus. */
export default function PreviewBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge asChild variant="destructive">
            <button type="button" data-preview-badge>
              {PREVIEW_BADGE_LABEL}
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{PREVIEW_BADGE_TOOLTIP}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
