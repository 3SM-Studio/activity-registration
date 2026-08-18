import { Card } from "@/components/ui/card";

export default function LoadingPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" aria-busy="true">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 w-4/5 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-3/5 animate-pulse rounded bg-neutral-200" />
        </div>
        <Card>
          <p className="text-sm text-neutral-600">Ładowanie formularza...</p>
        </Card>
      </div>
    </main>
  );
}
