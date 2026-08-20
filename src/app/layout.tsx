import type { Metadata } from "next";
import type { ReactNode } from "react";

import "react-phone-number-input/style.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Zapisy na zajęcia | Pracownia Twórcza Pozytywka",
  description: "Formularz zapisów na zajęcia Pracowni Twórczej Pozytywka.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
