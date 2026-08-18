import * as React from "react";

import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-base text-neutral-950 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
