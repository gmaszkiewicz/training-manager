import { useElementWidth } from "@/components/hooks/useElementWidth";
import { traineeName } from "@/lib/trainer-preview";
import { cn } from "@/lib/utils";

interface Props {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
}

/**
 * One line: "Ada Lovelace (ada@example.com)" where it fits, otherwise the email alone (truncated). A hidden copy of the
 * full line is measured against the space the label has; until both are measured the full line shows.
 */
export default function TraineeInlineLabel({ email, firstName, lastName, className }: Props) {
  const name = traineeName({ email, firstName, lastName });
  const [boxRef, boxWidth] = useElementWidth<HTMLSpanElement>();
  const [fullRef, fullWidth] = useElementWidth<HTMLSpanElement>();

  if (name === email) {
    return (
      <span className={cn("block min-w-0 truncate", className)} title={email}>
        {email}
      </span>
    );
  }

  const full = (
    <>
      <span className="font-semibold">{name}</span> <span className="font-normal">({email})</span>
    </>
  );
  const fits = boxWidth === null || fullWidth === null || fullWidth <= boxWidth;

  return (
    <span ref={boxRef} className={cn("relative block min-w-0 truncate", className)} title={`${name} (${email})`}>
      <span ref={fullRef} className="invisible absolute whitespace-nowrap" aria-hidden="true">
        {full}
      </span>
      {fits ? full : <span className="font-normal">{email}</span>}
    </span>
  );
}
