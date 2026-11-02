import { traineeName } from "@/lib/trainer-preview";
import { cn } from "@/lib/utils";

interface Props {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
}

/** The name over the email, one truncated line each, like the Collaborations Trainee column. */
export default function TraineeRowLabel({ email, firstName, lastName, className }: Props) {
  const name = traineeName({ email, firstName, lastName });
  return (
    <span className={cn("flex min-w-0 flex-col items-start text-left", className)}>
      <span className="text-foreground w-full truncate font-semibold" title={name}>
        {name}
      </span>
      {name !== email ? (
        <span className="text-muted-foreground w-full truncate font-normal" title={email}>
          {email}
        </span>
      ) : null}
    </span>
  );
}
