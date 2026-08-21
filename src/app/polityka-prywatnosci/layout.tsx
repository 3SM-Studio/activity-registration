import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/public-footer";

export default function PrivacyLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {children}
      <PublicFooter />
    </>
  );
}
