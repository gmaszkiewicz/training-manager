import type { FocusEventHandler, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  name?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  error?: string;
  invalid?: boolean;
  describedBy?: string;
  hint?: ReactNode;
  icon: ReactNode;
  endContent?: ReactNode;
  step?: string;
}

export function FormField({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  invalid,
  describedBy,
  hint,
  icon,
  endContent,
  step,
}: FormFieldProps) {
  const showError = !invalid && Boolean(error);

  return (
    <div>
      <Label htmlFor={id} className="text-muted-foreground mb-1">
        {label}
      </Label>
      <div className="relative">
        <span className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2">{icon}</span>
        <Input
          id={id}
          name={name ?? id}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          step={step}
          aria-invalid={invalid || error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("pl-10", endContent && "pr-14")}
        />
        {endContent}
      </div>
      {showError ? (
        <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
          <CircleAlert className="size-3" />
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
}
