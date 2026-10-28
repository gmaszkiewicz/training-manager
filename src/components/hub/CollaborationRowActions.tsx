import { useRef } from "react";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  viewerRole: "trainer" | "trainee";
  otherId: string;
  name: string;
  /** True once the trainee has given read access to measurements; false while the request is pending. */
  granted: boolean;
  page: number;
  confirmHref: string;
}

interface PostAction {
  label: string;
  action: string;
  intent?: "cancel" | "decline";
}

function postActionsFor(viewerRole: Props["viewerRole"], granted: boolean): PostAction[] {
  if (granted) {
    return [];
  }
  if (viewerRole === "trainer") {
    return [{ label: "Cancel request", action: "/api/collaborations/remove", intent: "cancel" }];
  }
  return [
    { label: "Accept request", action: "/api/collaborations/accept" },
    { label: "Decline request", action: "/api/collaborations/remove", intent: "decline" },
  ];
}

// Phone-width row actions behind an ellipsis menu, like the measurement rows. The menu content is portaled,
// so each POST action submits a hidden form rendered next to the trigger.
export default function CollaborationRowActions({ viewerRole, otherId, name, granted, page, confirmHref }: Props) {
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const postActions = postActionsFor(viewerRole, granted);

  return (
    <>
      {postActions.map((item, index) => (
        <form
          key={item.label}
          ref={(form) => {
            formRefs.current[index] = form;
          }}
          method="POST"
          action={item.action}
          hidden
        >
          <input type="hidden" name="other" value={otherId} />
          <input type="hidden" name="page" value={page} />
          {item.intent === undefined ? null : <input type="hidden" name="intent" value={item.intent} />}
        </form>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-12" aria-label={`Actions for ${name}`}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {granted ? (
            <DropdownMenuItem asChild>
              <a href={confirmHref}>{viewerRole === "trainer" ? "Unlink" : "Remove"}</a>
            </DropdownMenuItem>
          ) : (
            postActions.map((item, index) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => {
                  formRefs.current[index]?.requestSubmit();
                }}
              >
                {item.label}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
