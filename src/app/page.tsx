import { getPublicFormConfig } from "@/application/get-public-form-config";
import { RegistrationForm } from "@/components/registration/registration-form";
import { createApplicationRepositories } from "@/infrastructure/repositories";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function PozytywkaMark() {
  return (
    <div
      className="relative size-11 shrink-0 overflow-hidden rounded-[1rem] bg-neutral-950 shadow-[0_12px_30px_-16px_rgba(41,23,45,0.7)]"
      aria-hidden="true"
    >
      <span className="absolute -left-1 top-2 size-5 rounded-full bg-[var(--gold)]" />
      <span className="absolute bottom-1 left-4 h-7 w-3 rotate-[24deg] rounded-full bg-[var(--brand)]" />
      <span className="absolute right-1 top-1 h-5 w-3 -rotate-12 rounded-full bg-[var(--teal)]" />
    </div>
  );
}

export default async function HomePage() {
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
          <div className="mb-8 flex items-center gap-3">
            <PozytywkaMark />
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                Pracownia Twórcza
              </p>
              <p className="truncate text-lg font-extrabold tracking-[-0.02em] text-neutral-950">
                Pozytywka
              </p>
            </div>
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
