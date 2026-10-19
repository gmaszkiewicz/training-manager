import React, { useRef, useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { submitAuthForm } from "@/lib/auth-form";
import { CURRENT_PASSWORD_ERROR, PASSWORD_SAME_ERROR } from "@/lib/auth-reset";

const MIN_PASSWORD_LENGTH = 6;

function fieldForServerError(message: string | null | undefined): "currentPassword" | "password" | null {
  if (message === CURRENT_PASSWORD_ERROR) {
    return "currentPassword";
  }
  if (message === PASSWORD_SAME_ERROR) {
    return "password";
  }
  return null;
}

interface Props {
  serverError?: string | null;
  notice?: string | null;
}

export default function ChangePasswordForm({ serverError, notice }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const linkedField = fieldForServerError(serverError);
  const { items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy } = useFormErrors<
    "currentPassword" | "password" | "confirmPassword"
  >(
    linkedField ? null : serverError,
    linkedField && serverError ? { [linkedField]: serverError } : undefined,
    notice,
  );

  function validate() {
    const next: Partial<Record<"currentPassword" | "password" | "confirmPassword", string>> = {};

    if (!currentPassword) {
      next.currentPassword = "Current password is required";
    }

    if (!password) {
      next.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match";
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
    void submitAuthForm(form, "Could not change the password").then((result) => {
      if ("redirect" in result) {
        window.location.assign(result.redirect);
        return;
      }
      savingRef.current = false;
      setSaving(false);
      const field = fieldForServerError(result.error);
      if (field) {
        reportServerError(result.error, field);
        return;
      }
      reportServerError(result.error);
    });
  }

  return (
    <form method="POST" action="/api/auth/password" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="currentPassword"
        label="Current password"
        type={showCurrentPassword ? "text" : "password"}
        value={currentPassword}
        onChange={(v) => {
          setCurrentPassword(v);
          clearField("currentPassword");
        }}
        placeholder="Your password"
        invalid={fieldInvalid("currentPassword")}
        describedBy={describedBy("currentPassword")}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showCurrentPassword}
            onToggle={() => {
              setShowCurrentPassword(!showCurrentPassword);
            }}
          />
        }
      />

      <FormField
        id="password"
        label="New password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(v) => {
          setPassword(v);
          clearField("password");
        }}
        placeholder="Min. 6 characters"
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

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm password"
        type={showConfirmPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={(v) => {
          setConfirmPassword(v);
          clearField("confirmPassword");
        }}
        placeholder="Re-enter your password"
        invalid={fieldInvalid("confirmPassword")}
        describedBy={describedBy("confirmPassword")}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showConfirmPassword}
            onToggle={() => {
              setShowConfirmPassword(!showConfirmPassword);
            }}
          />
        }
      />

      <FormErrorToasts items={items} onDismiss={dismiss} />

      <SubmitButton pendingText="Saving password..." icon={<KeyRound className="size-4" />} forcePending={saving}>
        Save password
      </SubmitButton>
    </form>
  );
}
