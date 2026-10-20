import React, { useRef, useState } from "react";
import { Mail, Lock, UserPlus } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { submitAuthForm } from "@/lib/auth-form";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 6;

const roleInputClassName = cn(
  "peer border-input bg-background block size-4 appearance-none rounded-full border shadow-xs",
  "checked:border-primary checked:bg-primary",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
);

interface Props {
  serverError?: string | null;
}

export default function SignUpForm({ serverError }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"" | "trainee" | "trainer">("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy } = useFormErrors<
    "email" | "password" | "confirmPassword" | "role"
  >(serverError);

  function validate() {
    const next: Partial<Record<"email" | "password" | "confirmPassword" | "role", string>> = {};

    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address";
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

    if (!role) {
      next.role = "Role is required";
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
    void submitAuthForm(form, "Could not create the account").then((result) => {
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
    <form method="POST" action="/api/auth/signup" className="space-y-4" onSubmit={handleSubmit} noValidate>
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

      <fieldset aria-invalid={fieldInvalid("role") ? true : undefined} aria-describedby={describedBy("role")}>
        <legend className="text-muted-foreground mb-1 block text-sm">Role</legend>
        <div className="flex gap-4">
          <label className="text-card-foreground flex items-center gap-2 text-sm">
            <span className="relative size-4">
              <input
                id="role-trainee"
                type="radio"
                name="role"
                value="trainee"
                required
                checked={role === "trainee"}
                onChange={() => {
                  setRole("trainee");
                  clearField("role");
                }}
                aria-invalid={fieldInvalid("role") ? true : undefined}
                className={roleInputClassName}
              />
              <span className="bg-primary-foreground pointer-events-none absolute inset-1 hidden rounded-full peer-checked:block" />
            </span>
            Trainee
          </label>
          <label className="text-card-foreground flex items-center gap-2 text-sm">
            <span className="relative size-4">
              <input
                id="role-trainer"
                type="radio"
                name="role"
                value="trainer"
                required
                checked={role === "trainer"}
                onChange={() => {
                  setRole("trainer");
                  clearField("role");
                }}
                aria-invalid={fieldInvalid("role") ? true : undefined}
                className={roleInputClassName}
              />
              <span className="bg-primary-foreground pointer-events-none absolute inset-1 hidden rounded-full peer-checked:block" />
            </span>
            Trainer
          </label>
        </div>
      </fieldset>

      <FormErrorToasts items={items} onDismiss={dismiss} />

      <SubmitButton pendingText="Creating account..." icon={<UserPlus className="size-4" />} forcePending={saving}>
        Create account
      </SubmitButton>
    </form>
  );
}
