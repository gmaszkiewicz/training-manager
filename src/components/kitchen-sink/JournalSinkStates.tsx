import { Calendar, Plus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";

interface Props {
  variant: "disabled" | "error" | "loading";
}

export default function JournalSinkStates({ variant }: Props) {
  if (variant === "disabled" || variant === "loading") {
    return (
      <div className="w-full max-w-sm">
        <SubmitButton forcePending pendingText="Adding measurement..." icon={<Plus className="size-4" />}>
          Add measurement
        </SubmitButton>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <FormField
        id="sink-measured-on"
        type="datetime-local"
        label="Date and time"
        value=""
        onChange={() => undefined}
        error="Date and time are required."
        icon={<Calendar className="size-4" />}
      />
    </div>
  );
}
