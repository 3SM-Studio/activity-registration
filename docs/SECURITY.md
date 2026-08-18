# Security

## Google authentication

Produkcja:

```text
Vercel OIDC
-> Google Workload Identity Federation
-> service account impersonation
-> Google Sheets API
```

Nie używamy produkcyjnego długowiecznego private key service account.

Local development może korzystać z Google Application Default Credentials wyłącznie do środowiska TEST.

## PII

Logi nie mogą zawierać:

- imienia,
- nazwiska,
- telefonu,
- e-maila,
- danych opiekuna,
- request body.

Dopuszczalne identyfikatory techniczne:

- requestId,
- registrationId,
- error code,
- HTTP status,
- czas operacji.

## Google Sheets

- wartości użytkownika: `RAW`,
- wymagane nagłówki są walidowane,
- duplikaty technicznych ID w katalogu są błędem,
- frontend nie posiada dostępu do credentials Google.

## Public endpoint

MVP ma:

- JSON-only POST,
- limit rozmiaru requestu,
- honeypot,
- podstawowy timing abuse check bez traktowania go jako silnego zabezpieczenia,
- stabilne publiczne error codes,
- brak ujawniania odpowiedzi Google API.

CAPTCHA/Turnstile dodajemy po realnym sygnale abuse lub przed dużą kampanią.

## Privacy

Produkcja jest blokowana logicznie, jeśli nie ma:

- `PRIVACY_NOTICE_URL`,
- `PRIVACY_NOTICE_VERSION`.

Treść prawna i okres retencji muszą zostać zatwierdzone poza kodem.

## Ambiguous writes

`values.append` nie jest automatycznie retryowane wewnątrz klienta Google. Jeśli wynik zapisu jest niepewny, retry całego zgłoszenia używa tego samego `requestId`; backend najpierw odczytuje istniejący rekord, a dopiero potem ewentualnie wykonuje kolejny append. Dzięki temu retry transportowy nie omija warstwy idempotencji.

## Browser headers

Aplikacja ustawia bazowe nagłówki bezpieczeństwa dla wszystkich tras:

- `Content-Security-Policy` ograniczone na razie do `frame-ancestors`, `base-uri` i `form-action`,
- `X-Frame-Options: DENY`,
- `X-Content-Type-Options: nosniff`,
- `Referrer-Policy: strict-origin-when-cross-origin`,
- `Permissions-Policy` wyłącza nieużywane camera, microphone, geolocation i browsing topics.

Pełny CSP dla `script-src`/`style-src` nie jest dokładany na ślepo, ponieważ Next.js wymaga świadomej konfiguracji nonce/hash.
