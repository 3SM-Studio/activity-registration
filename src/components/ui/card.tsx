import type * as React from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-neutral-200 bg-white p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.28)] sm:p-8",
        className,
      )}
      {...props}
    />
  );
}
