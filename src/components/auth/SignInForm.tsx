import React, { useRef, useState } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { submitAuthForm } from "@/lib/auth-form";

const INVALID_LOGIN_ERROR = "Invalid login credentials";

interface Props {
  serverError?: string | null;
}

export default function SignInForm({ serverError }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy } = useFormErrors<
    "email" | "password"
  >(serverError, {}, undefined, serverError === INVALID_LOGIN_ERROR ? ["email", "password"] : undefined);

  function validate() {
    const next: Partial<Record<"email" | "password", string>> = {};
    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address";
    }
    if (!password) {
      next.password = "Password is required";
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
    void submitAuthForm(form, "Could not sign in").then((result) => {
      if ("redirect" in result) {
        window.location.assign(result.redirect);
        return;
      }
      savingRef.current = false;
      setSaving(false);
      if (result.error === INVALID_LOGIN_ERROR) {
        reportServerError(result.error, ["email", "password"]);
        return;
      }
      reportServerError(result.error);
    });
  }

  return (
    <form method="POST" action="/api/auth/signin" className="space-y-4" onSubmit={handleSubmit} noValidate>
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

      <FormField
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(v) => {
          setPassword(v);
          clearField("password");
        }}
        placeholder="Your password"
        invalid={fieldInvalid("password")}
        describedBy={describedBy("password")}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showPassword}
            onToggle={() => {
              setShowPassword(!showPassword);
            }}
          />
        }
      />

      <FormErrorToasts items={items} onDismiss={dismiss} />

      <SubmitButton pendingText="Signing in..." icon={<LogIn className="size-4" />} forcePending={saving}>
        Sign in
      </SubmitButton>
    </form>
  );
}
