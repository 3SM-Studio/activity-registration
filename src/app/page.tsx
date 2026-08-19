import Image from "next/image";
import { CircleAlert } from "lucide-react";

import { getPublicFormConfig } from "@/application/get-public-form-config";
import { RegistrationForm } from "@/components/registration/registration-form";
import { createApplicationRepositories } from "@/infrastructure/repositories";
import {
  getServerEnv,
  isUnconfiguredVercelPreview,
  isUnconfiguredVercelProduction,
} from "@/lib/env";

export const dynamic = "force-dynamic";

function PozytywkaLogo() {
  return (
    <Image
      src="/pozytywka-logo.webp"
      alt="Pracownia Twórcza Pozytywka"
      width={360}
      height={276}
      unoptimized
      className="h-auto w-36 shrink-0 sm:w-40"
    />
  );
}

function ClosedState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center">
        <section className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_28px_90px_-48px_rgba(77,36,58,0.34)] sm:p-10">
          <div className="mb-8">
            <PozytywkaLogo />
          </div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[var(--teal)]">
            <CircleAlert className="size-4" aria-hidden="true" />
            <span>Zapisy online</span>
          </div>
          <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.04em] text-neutral-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">{description}</p>
        </section>
      </div>
    </main>
  );
}

export default async function HomePage() {
  if (isUnconfiguredVercelProduction()) {
    return (
      <ClosedState
        title="Zapisy są obecnie zamknięte"
        description="Formularz produkcyjny nie został jeszcze uruchomiony. Wróć później, gdy zapisy będą gotowe do przyjmowania zgłoszeń."
      />
    );
  }

  if (isUnconfiguredVercelPreview()) {
    return (
      <ClosedState
        title="Ten podgląd nie przyjmuje zapisów"
        description="Pełne środowisko testowe działa wyłącznie na stałej gałęzi preview."
      />
    );
  }

  const env = getServerEnv();
  const { catalog, settings } = await getPublicFormConfig(createApplicationRepositories(), {
    requirePrivacyConfiguration: env.APP_ENV === "production",
  });

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
      <div
        className="pointer-events-none absolute -right-20 top-16 size-56 rounded-full border-[42px] border-[rgb(246_200_95_/_0.18)] sm:-right-10 sm:size-72"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 top-[28rem] size-48 rotate-12 rounded-[3.5rem] bg-[rgb(20_122_118_/_0.05)] sm:size-64"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-3xl">
        <header className="mb-7 pt-1 sm:mb-9">
          <div className="mb-8 flex items-center gap-4">
            <PozytywkaLogo />
            <span className="ml-auto hidden border-l border-[var(--line)] pl-4 text-sm font-semibold text-neutral-600 sm:block">
              Zapisy online
            </span>
          </div>

          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-[var(--teal)]">
              Zapisy na zajęcia
            </p>
            <h1 className="text-balance text-[clamp(2.25rem,8vw,3.75rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-neutral-950">
              {settings.formTitle}
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-[1.05rem] leading-7 text-neutral-600">
              Wybierz miasto i zajęcia, a potem uzupełnij dane uczestnika. Formularz pokaże tylko
              informacje potrzebne do zgłoszenia.
            </p>

            <ol className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">
                  1
                </span>
                Zajęcia
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                  2
                </span>
                Uczestnik
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                  3
                </span>
                Kontakt
              </li>
            </ol>
          </div>
        </header>

        <RegistrationForm catalog={catalog} settings={settings} />

        <footer className="px-2 pb-2 pt-6 text-center text-xs leading-5 text-neutral-500">
          Pracownia Twórcza Pozytywka · formularz zapisów
        </footer>
      </div>
    </main>
  );
}
