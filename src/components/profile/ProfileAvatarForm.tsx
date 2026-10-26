import React, { useEffect, useRef, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAuthForm } from "@/lib/auth-form";
import {
  AVATAR_LARGE_ERROR,
  AVATAR_MISSING_ERROR,
  AVATAR_MIME_TYPES,
  AVATAR_TYPE_ERROR,
  parseAvatarFile,
} from "@/lib/profile-avatar";

type Field = "avatar";
type Intent = "upload" | "remove";

const FALLBACK_ERROR = "Could not save your avatar";
const ACCEPT = Object.keys(AVATAR_MIME_TYPES).join(",");
const FILE_ERRORS: readonly string[] = [AVATAR_MISSING_ERROR, AVATAR_TYPE_ERROR, AVATAR_LARGE_ERROR];

function isFileError(message: string | null | undefined): message is string {
  return typeof message === "string" && FILE_ERRORS.includes(message);
}

// The default FormData leaves out the clicked button, which would drop `intent`.
function avatarFormData(form: HTMLFormElement, submitter: HTMLElement | null, intent: Intent): FormData {
  const body = new FormData(form, submitter);
  body.set("intent", intent);
  if (intent === "remove") {
    body.delete("avatar");
  }
  return body;
}

interface Props {
  avatarUrl: string | null;
  initials: string;
  serverError?: string | null;
  notice?: string | null;
  unavailable?: boolean;
}

export default function ProfileAvatarForm({ avatarUrl, initials, serverError, notice, unavailable }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState<Intent | null>(null);
  const pendingRef = useRef(false);
  const linked = isFileError(serverError);
  const { items, dismiss, clearField, showErrors, reportServerError, fieldInvalid, describedBy } = useFormErrors<Field>(
    linked ? null : serverError,
    linked ? { avatar: serverError } : undefined,
    notice,
  );

  // Revoke each preview URL when it is replaced and on unmount.
  useEffect(() => {
    if (preview === null) {
      return undefined;
    }
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    clearField("avatar");
    const file = event.target.files?.[0];
    const parsed = parseAvatarFile(file);
    setPreview(parsed.ok ? URL.createObjectURL(parsed.file) : null);
    if (file && !parsed.ok) {
      showErrors({ avatar: parsed.error });
    }
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable || pendingRef.current) {
      return;
    }
    const form = event.currentTarget;
    const submitter = event.nativeEvent.submitter;
    const intent: Intent = submitter instanceof HTMLButtonElement && submitter.value === "remove" ? "remove" : "upload";

    if (intent === "upload") {
      const input = form.elements.namedItem("avatar");
      const parsed = parseAvatarFile(input instanceof HTMLInputElement ? input.files?.[0] : undefined);
      if (!parsed.ok) {
        showErrors({ avatar: parsed.error });
        return;
      }
      showErrors({});
    }

    pendingRef.current = true;
    setPending(intent);
    void submitAuthForm(form, FALLBACK_ERROR, avatarFormData(form, submitter, intent)).then((result) => {
      if ("redirect" in result) {
        window.location.assign(result.redirect);
        return;
      }
      pendingRef.current = false;
      setPending(null);
      if (isFileError(result.error)) {
        reportServerError(result.error, "avatar");
        return;
      }
      reportServerError(result.error);
    });
  }

  const shown = preview ?? avatarUrl;
  const busy = pending !== null;

  return (
    <form
      method="POST"
      action="/api/profile/avatar"
      encType="multipart/form-data"
      className="space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="flex justify-center">
        <Avatar className="size-24">
          {shown ? <AvatarImage key={shown} src={shown} alt="" className="object-cover" /> : null}
          <AvatarFallback className="text-card-foreground text-2xl font-semibold">{initials}</AvatarFallback>
        </Avatar>
      </div>

      <fieldset disabled={unavailable === true || busy} className="space-y-4">
        <div>
          <Label htmlFor="avatar" className="text-muted-foreground mb-1">
            Image
          </Label>
          <Input
            id="avatar"
            name="avatar"
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            aria-invalid={fieldInvalid("avatar") ? true : undefined}
            aria-describedby={describedBy("avatar")}
          />
          <p className="text-muted-foreground mt-1 text-xs">PNG, JPEG or WebP, up to 2 MB.</p>
        </div>

        <Button type="submit" name="intent" value="upload" className="w-full">
          <Save className="size-4" />
          {pending === "upload" ? "Saving avatar..." : "Save"}
        </Button>

        {avatarUrl !== null ? (
          <Button type="submit" name="intent" value="remove" variant="outline" className="w-full">
            <Trash2 className="size-4" />
            {pending === "remove" ? "Removing avatar..." : "Remove"}
          </Button>
        ) : null}
      </fieldset>

      <FormErrorToasts items={items} onDismiss={dismiss} />
    </form>
  );
}
