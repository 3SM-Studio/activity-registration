import { notFound } from "next/navigation";

import { getServerEnv } from "@/lib/env";

export default function TestPrivacyPage() {
  if (getServerEnv().APP_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Informacja o prywatności</h1>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        To jest wyłącznie placeholder środowiska TEST. Produkcja wymaga zatwierdzonej informacji o
        przetwarzaniu danych i jej wersji w arkuszu USTAWIENIA.
      </div>
    </main>
  );
}
