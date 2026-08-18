import { getPublicFormConfig } from "@/application/get-public-form-config";
import { RegistrationForm } from "@/components/registration/registration-form";
import { createApplicationRepositories } from "@/infrastructure/repositories";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const env = getServerEnv();
  const { catalog, settings } = await getPublicFormConfig(createApplicationRepositories(), {
    requirePrivacyConfiguration: env.APP_ENV === "production",
  });

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Formularz zapisów
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            {settings.formTitle}
          </h1>
          <p className="mt-3 max-w-xl text-pretty leading-7 text-neutral-600">
            Wybierz miasto i zajęcia, a następnie uzupełnij dane uczestnika.
          </p>
        </div>

        <RegistrationForm catalog={catalog} settings={settings} />
      </div>
    </main>
  );
}
