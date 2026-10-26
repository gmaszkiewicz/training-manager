import React, { useRef, useState } from "react";
import { Mail, Save, User } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAuthForm } from "@/lib/auth-form";
import { FIRST_NAME_LONG_ERROR, LAST_NAME_LONG_ERROR, profileNamesSchema } from "@/lib/profile-form";

type Field = "firstName" | "lastName";

function fieldForServerError(message: string | null | undefined): Field | null {
  if (message === FIRST_NAME_LONG_ERROR) {
    return "firstName";
  }
  if (message === LAST_NAME_LONG_ERROR) {
    return "lastName";
  }
  return null;
}

interface Props {
  email: string;
  firstName: string | null;
  lastName: string | null;
  serverError?: string | null;
  notice?: string | null;
  unavailable?: boolean;
}

export default function ProfileDetailsForm({ email, firstName, lastName, serverError, notice, unavailable }: Props) {
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const linkedField = fieldForServerError(serverError);
  const { items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy } = useFormErrors<Field>(
    linkedField ? null : serverError,
    linkedField && serverError ? { [linkedField]: serverError } : undefined,
    notice,
  );

  function validate() {
    const parsed = profileNamesSchema.safeParse({ firstName: first, lastName: last });
    const next: Partial<Record<Field, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "firstName" || field === "lastName") && next[field] === undefined) {
          next[field] = issue.message;
        }
      }
    }
    showErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable || !validate() || savingRef.current) {
      return;
    }
    const form = event.currentTarget;
    savingRef.current = true;
    setSaving(true);
    void submitAuthForm(form, "Could not save your details").then((result) => {
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
    <form method="POST" action="/api/profile" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <Label htmlFor="email" className="text-muted-foreground mb-1">
          Email
        </Label>
        <div className="relative">
          <span className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2">
            <Mail className="size-4" />
          </span>
          <Input id="email" type="email" value={email} readOnly className="bg-muted text-muted-foreground pl-10" />
        </div>
      </div>

      <fieldset disabled={unavailable} className="space-y-4">
        <FormField
          id="firstName"
          label="First name"
          value={first}
          onChange={(v) => {
            setFirst(v);
            clearField("firstName");
          }}
          placeholder="Your first name"
          invalid={fieldInvalid("firstName")}
          describedBy={describedBy("firstName")}
          icon={<User className="size-4" />}
        />

        <FormField
          id="lastName"
          label="Last name"
          value={last}
          onChange={(v) => {
            setLast(v);
            clearField("lastName");
          }}
          placeholder="Your last name"
          invalid={fieldInvalid("lastName")}
          describedBy={describedBy("lastName")}
          icon={<User className="size-4" />}
        />
      </fieldset>

      <FormErrorToasts items={items} onDismiss={dismiss} />

      <fieldset disabled={unavailable}>
        <SubmitButton pendingText="Saving details..." icon={<Save className="size-4" />} forcePending={saving}>
          Save
        </SubmitButton>
      </fieldset>
    </form>
  );
}
