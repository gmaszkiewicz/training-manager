import { useState } from "react";
import { Mail, LogIn } from "lucide-react";
import { FormErrorToasts, type FormErrorItem } from "@/components/auth/FormErrorToasts";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";

interface Props {
  variant: "disabled" | "error" | "loading";
}

const errorToasts: FormErrorItem[] = [
  { id: "sink-email-error", message: "Email is required" },
  { id: "sink-server-error", message: "Invalid email or password" },
];

export default function AuthSinkStates({ variant }: Props) {
  const [items, setItems] = useState(errorToasts);
  const emailError = items.some((item) => item.id === "sink-email-error");

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
        invalid={emailError}
        describedBy={emailError ? "sink-email-error" : undefined}
        icon={<Mail className="size-4" />}
      />
      <FormErrorToasts
        items={items}
        onDismiss={(id) => {
          setItems((current) => current.filter((item) => item.id !== id));
        }}
      />
    </div>
  );
}
