import type * as React from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_28px_90px_-48px_rgba(77,36,58,0.34)] sm:p-8",
        className,
      )}
      {...props}
    />
  );
}
