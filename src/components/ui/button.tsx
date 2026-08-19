import * as React from "react";

import { cn } from "@/lib/cn";

export function Button({
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand)] px-5 py-3.5 text-base font-bold text-white shadow-[0_14px_34px_-18px_rgba(163,32,90,0.72)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
