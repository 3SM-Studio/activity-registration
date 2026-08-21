import Link from "next/link";

const linkClassName =
  "rounded-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function PublicFooter() {
  return (
    <footer className="not-typeset mx-auto w-full max-w-3xl px-2 pb-4 pt-7 text-center text-xs leading-6 text-muted-foreground">
      <p>Pracownia Twórcza Pozytywka · formularz zapisów</p>
      <nav
        aria-label="Informacje i bezpieczeństwo"
        className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2"
      >
        <Link className={linkClassName} href="/polityka-prywatnosci">
          Polityka prywatności
        </Link>
        <Link className={linkClassName} href="/standardy-ochrony-maloletnich">
          Standardy ochrony małoletnich
        </Link>
        <Link className={linkClassName} href="/standardy-ochrony-maloletnich/dla-dzieci">
          Zasady dla dzieci i młodzieży
        </Link>
        <a className={linkClassName} href="mailto:pozytywka.boleslaw@gmail.com">
          Kontakt
        </a>
      </nav>
    </footer>
  );
}
