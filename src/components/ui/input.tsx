import * as React from "react";

import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-2xl border border-neutral-400 bg-white px-4 text-base text-neutral-950 shadow-[0_1px_0_rgba(41,23,45,0.04)] outline-none transition placeholder:text-neutral-500 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
