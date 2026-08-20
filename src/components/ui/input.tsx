import * as React from "react";

import { cn } from "@/lib/cn";
import { sanitizeEmailWhileTyping, sanitizePersonNameWhileTyping } from "@/lib/text-normalization";

function Input({
  className,
  type,
  autoComplete,
  onInput,
  ...props
}: React.ComponentProps<"input">) {
  const sanitizeAsPersonName = autoComplete === "given-name" || autoComplete === "family-name";
  const sanitizeAsEmail = type === "email";

  const handleInput: React.InputEventHandler<HTMLInputElement> = (event) => {
    if (sanitizeAsPersonName) {
      event.currentTarget.value = sanitizePersonNameWhileTyping(event.currentTarget.value);
    } else if (sanitizeAsEmail) {
      event.currentTarget.value = sanitizeEmailWhileTyping(event.currentTarget.value);
    }

    onInput?.(event);
  };

  return (
    <input
      type={type}
      autoComplete={autoComplete}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-2xl border border-input bg-background px-4 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      onInput={handleInput}
      {...props}
    />
  );
}

export { Input };
