import * as React from "react";

import { cn } from "@/lib/cn";

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-12 w-full appearance-none rounded-2xl border border-[var(--line)] bg-white px-4 pr-10 text-base text-neutral-950 shadow-[0_1px_0_rgba(41,23,45,0.04)] outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
NativeSelect.displayName = "NativeSelect";
