# Durable notification outbox

## Cel

Registration jest źródłem prawdy o przyjęciu zgłoszenia. Awaria e-maila nie może cofnąć poprawnie zapisanego zgłoszenia, ale nie może też bez śladu zgubić powiadomienia.

`POWIADOMIENIA` jest systemowym outboxem bez PII. Przechowuje wyłącznie techniczne identyfikatory, typ powiadomienia, stan retry, lease i timestamps.

## Stany

- `PENDING` - oczekuje na pierwszą próbę lub retry.
- `SENDING` - job został przejęty przez worker na czas ograniczony przez `LEASE_UNTIL`.
- `SENT` - provider potwierdził wysyłkę. Tego joba nie wysyłamy ponownie.
- `FAILED` - ostatnia próba nie powiodła się. `NEXT_ATTEMPT_AT` określa najwcześniejszy retry.
- `SKIPPED` - historyczne zgłoszenie sprzed wdrożenia outboxu. Nie wysyłamy go ponownie i nie udajemy, że dostarczenie zostało potwierdzone.

Każde Registration ma dwa stabilne joby:

- `registration-confirmation/<REGISTRATION_ID>`
- `registration-admin/<REGISTRATION_ID>`

Te same identyfikatory są provider idempotency keys.

## Retry i równoległość

Worker przed wysyłką zapisuje `SENDING`, zwiększa `ATTEMPT_COUNT` i zapisuje losowy `LEASE_TOKEN` z terminem wygaśnięcia. Po zapisie ponownie odczytuje job i wysyła tylko wtedy, gdy nadal posiada lease.

Google Sheets nie udostępnia transakcyjnego compare-and-swap. Dlatego drugi poziom ochrony przed duplikatem stanowi stabilny provider idempotency key. Lease ogranicza równoległe wykonanie po stronie aplikacji, a provider idempotency chroni transport.

Po awarii provider job przechodzi do `FAILED`. Retry używa exponential backoff od 1 minuty do maksymalnie 24 godzin. Do arkusza trafia wyłącznie bezpieczny kod `EMAIL_PROVIDER_ERROR`, bez treści wyjątku i bez PII.

## Automatyczny worker

Każde nowe zgłoszenie nadal próbuje wysłać swoje dwa powiadomienia natychmiast po zapisaniu Registration. Dodatkowo Production ma zabezpieczony endpoint:

```text
GET /api/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

Endpoint uruchamia pełny reconciliation i podejmuje wyłącznie joby, które są due. `CRON_SECRET` jest wymagany w Production i musi mieć co najmniej 32 znaki. Nie wolno zapisywać go w repozytorium ani w logach.

Projekt działa na Vercel Hobby, dlatego platformowy cron jest ustawiony na raz dziennie:

```text
15 2 * * *
```

To jest warstwa awaryjnego odzyskiwania. Pierwsza próba wysyłki pozostaje natychmiastowa. W czasie aktywnego launchu operator powinien dodatkowo obserwować `POWIADOMIENIA` / `diagnostics` i ręcznie uruchomić retry, jeśli provider chwilowo zawiedzie. Częstszy automatyczny worker wymaga innego schedulera albo planu Vercel pozwalającego na częstsze crony.

## Reconciliation ręczny

```bash
pnpm notifications:reconcile
```

Komenda:

1. odczytuje Registration,
2. odtwarza brakujące joby,
3. podejmuje tylko joby, które są aktualnie due,
4. nie wysyła ponownie `SENT` ani `SKIPPED`.

Ręczny retry wszystkich `FAILED`:

```bash
pnpm notifications:retry
```

Komenda ustawia failed jobs jako due i uruchamia zwykły reconcile.

## Pierwsze wdrożenie

Przed aktywacją outboxu środowisko musi być zamknięte.

1. `REGISTRATIONS_OPEN=FALSE`.
2. `pnpm sheet:schema-sync` tworzy i waliduje `POWIADOMIENIA`.
3. `pnpm notifications:adopt` tworzy dla istniejących Registration terminalne joby `SKIPPED` z kodem `PRE_OUTBOX_REGISTRATION`.
4. Uruchomić `pnpm sheet:validate` i `pnpm diagnostics`.
5. Dopiero po poprawnej walidacji można dopuścić nowe Registration.

`notifications:adopt` odmawia pracy przy otwartych zapisach i odmawia ponownego uruchomienia, jeśli outbox zawiera już joby.

## Monitoring

Alarm operacyjny stanowią:

- joby `FAILED`,
- joby `SENDING` z wygasłym lease,
- nowe Registration bez kompletu dwóch jobów.

`pnpm diagnostics` sprawdza te trzy warunki i kończy się błędem, jeśli outbox nie jest zdrowy. Raportuje również liczbę jobów, dzięki czemu outbox jest częścią normalnego release/operations gate, a nie tylko pasywnym arkuszem.

Nie należy ręcznie edytować `POWIADOMIENIA` podczas normalnej pracy. Naprawy wykonujemy przez reconcile/retry i udokumentowane operacje administracyjne.
