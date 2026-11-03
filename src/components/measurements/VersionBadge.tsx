import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { VersionStage } from "@/types";

export const PREVIEW_BADGE_LABEL = "Preview";
export const PREVIEW_BADGE_TOOLTIP = "Preview version — it may contain bugs.";
export const RC_BADGE_LABEL = "RC";
export const RC_BADGE_TOOLTIP = "Release candidate - it may contain bugs";

interface Props {
  /** A preview shows the red "Preview" mark, a release candidate the yellow "RC" one. */
  stage: Exclude<VersionStage, "stable">;
}

/** The version mark in a tile header, with its warning on hover and keyboard focus. */
export default function VersionBadge({ stage }: Props) {
  const rc = stage === "rc";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge asChild variant={rc ? "warning" : "destructive"}>
            <button type="button" data-preview-badge data-rc-badge={rc ? "" : undefined}>
              {rc ? RC_BADGE_LABEL : PREVIEW_BADGE_LABEL}
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{rc ? RC_BADGE_TOOLTIP : PREVIEW_BADGE_TOOLTIP}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
