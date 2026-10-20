import React, { useRef, useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { submitAuthForm } from "@/lib/auth-form";
import { PASSWORD_MISMATCH_ERROR, PASSWORD_SHORT_ERROR } from "@/lib/auth-reset";

const MIN_PASSWORD_LENGTH = 6;

interface Props {
  tokenHash: string;
  serverError?: string | null;
}

export default function ResetPasswordForm({ tokenHash, serverError }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy } = useFormErrors<
    "password" | "confirmPassword"
  >(serverError);

  function validate() {
    const next: Partial<Record<"password" | "confirmPassword", string>> = {};

    if (!password) {
      next.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = PASSWORD_SHORT_ERROR;
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      next.confirmPassword = PASSWORD_MISMATCH_ERROR;
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
    void submitAuthForm(form, "Could not reset the password").then((result) => {
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
    <form
      method="POST"
      action="/api/auth/reset-password/confirm"
      className="space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value="recovery" />

      <FormField
        id="password"
        label="Password"
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
