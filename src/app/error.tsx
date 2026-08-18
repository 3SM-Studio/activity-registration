"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Card className="text-center" role="alert">
          <h1 className="text-xl font-semibold text-neutral-950">
            Formularz jest chwilowo niedostępny
          </h1>
          <p className="mt-2 text-neutral-600">
            Nie udało się pobrać aktualnych danych zapisów. Spróbuj ponownie.
          </p>
          <Button type="button" className="mt-5" onClick={reset}>
            Spróbuj ponownie
          </Button>
        </Card>
      </div>
    </main>
  );
}
