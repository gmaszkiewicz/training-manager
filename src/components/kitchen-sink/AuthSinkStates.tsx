import { Mail, LogIn } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";

interface Props {
  variant: "disabled" | "error" | "loading";
}

export default function AuthSinkStates({ variant }: Props) {
  if (variant === "disabled" || variant === "loading") {
    return (
      <div className="w-full max-w-sm">
        <SubmitButton forcePending pendingText="Signing in..." icon={<LogIn className="size-4" />}>
          Sign in
        </SubmitButton>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <FormField
        id="sink-email"
        type="email"
        label="Email"
        value=""
        onChange={() => undefined}
        placeholder="you@example.com"
        error="Email is required"
        icon={<Mail className="size-4" />}
      />
      <ServerError message="Invalid email or password" />
    </div>
  );
}
