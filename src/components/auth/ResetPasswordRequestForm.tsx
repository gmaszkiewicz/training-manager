import React, { useRef, useState } from "react";
import { Mail, Send } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { submitAuthForm } from "@/lib/auth-form";

interface Props {
  serverError?: string | null;
}

export default function ResetPasswordRequestForm({ serverError }: Props) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy } =
    useFormErrors<"email">(serverError);

  function validate() {
    const next: Partial<Record<"email", string>> = {};
    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address";
    }
    showErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || savingRef.current) {
      return;
    }
    const form = event.currentTarget;
    savingRef.current = true;
    setSaving(true);
    void submitAuthForm(form, "Could not send the reset email").then((result) => {
      if ("redirect" in result) {
        window.location.assign(result.redirect);
        return;
      }
      savingRef.current = false;
      setSaving(false);
      reportServerError(result.error);
    });
  }

  return (
    <form method="POST" action="/api/auth/reset-password" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="email"
        type="email"
        label="Email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          clearField("email");
        }}
        placeholder="you@example.com"
        invalid={fieldInvalid("email")}
        describedBy={describedBy("email")}
        icon={<Mail className="size-4" />}
      />

      <FormErrorToasts items={items} onDismiss={dismiss} />

      <SubmitButton pendingText="Sending reset email..." icon={<Send className="size-4" />} forcePending={saving}>
        Send reset email
      </SubmitButton>
    </form>
  );
}
