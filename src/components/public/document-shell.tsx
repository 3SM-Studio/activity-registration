import type { ReactNode } from "react";
import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";

export function DocumentShell({
  eyebrow,
  title,
  meta,
  children,
  backHref = "/",
  backLabel = "Wróć do zapisów",
}: Readonly<{
  eyebrow: string;
  title: string;
  meta: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}>) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="typeset typeset-legal rounded-3xl border bg-card p-6 shadow-sm sm:p-10 lg:p-12">
        <header className="max-w-3xl border-b pb-8">
          <p className="not-typeset text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-balance text-3xl tracking-tight sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-muted-foreground">{meta}</p>
          <p className="not-typeset mt-5">
            <Link
              href={backHref}
              className="rounded-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {backLabel}
            </Link>
          </p>
        </header>
        <div className="max-w-3xl">{children}</div>
      </article>
      <PublicFooter />
    </main>
  );
}
