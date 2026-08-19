# Security

## Public repository

Repozytorium `3SM-Studio/activity-registration` jest świadomie publiczne.

Publiczne repo nie może zawierać:

- tokenów,
- private keys,
- credentials JSON,
- wartości `.env.local`,
- realnych PII,
- danych uczestników,
- sekretów Resend ani Google.

`.env*` jest ignorowane, z wyjątkiem jawnie bezsekretowego `.env.example`.

## Google authentication

Vercel:

```text
Vercel OIDC
-> Google Workload Identity Federation
-> service account impersonation
-> Google Sheets API
```

Nie używamy produkcyjnego długowiecznego private key service account.

Local development może korzystać z Google Application Default Credentials wyłącznie do środowiska TEST.

## TEST / PROD identity isolation

Preview i Production nie mogą współdzielić jednej tożsamości z dostępem do obu arkuszy.

Docelowy model:

```text
Preview subject
-> TEST service account
-> TEST Sheet only

Production subject
-> PROD service account
-> PROD Sheet only
```

Obecny TEST service account nie może otrzymać dostępu do PROD Sheet. Osobny PROD service account i production WIF binding są blockerem przed uruchomieniem PROD.

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
- frontend nie posiada dostępu do credentials Google,
- nieidempotentny `append` nie jest automatycznie retryowany,
- techniczne kolumny `ZAPISY` mają warning-only protected ranges,
- `STATUS` i `NOTES` pozostają kolumnami operacyjnymi.

Warning-only protection chroni przed przypadkową ręczną edycją, ale nie jest granicą bezpieczeństwa. Prawdziwą granicą są uprawnienia Drive/Sheets, osobne identity TEST/PROD i serwerowy write path.

## Public endpoint

MVP ma:

- JSON-only POST,
- limit rozmiaru requestu,
- honeypot,
- minimalny sensowny czas od renderu do submit,
- stabilne publiczne error codes,
- brak ujawniania odpowiedzi Google API,
- brak sesji i uprzywilejowanych cookies użytkownika.

Głównym ryzykiem publicznego endpointu jest spam/abuse, nie klasyczny session CSRF.

CAPTCHA/Turnstile dodajemy po realnym sygnale abuse lub przed większą kampanią.

## Privacy

Produkcja jest blokowana logicznie, jeśli nie ma:

- `PRIVACY_NOTICE_URL`,
- `PRIVACY_NOTICE_VERSION`.

Treść prawna i okres retencji muszą zostać zatwierdzone poza kodem.

## Email

Po persistence aplikacja wykonuje best-effort participant/admin notifications przez Resend.

- błąd maila nie cofa Registration,
- replay tego samego `requestId` nie wysyła maili drugi raz,
- klucz API jest wyłącznie server-side,
- message content jest HTML-escaped,
- durable retry/outbox jest osobnym hardeningiem, issue #3.

Przed PROD należy potwierdzić, że każdy wcześniej ujawniony lub testowy Resend key został unieważniony i nie jest używany.

## Ambiguous writes

`values.append` nie jest automatycznie retryowane wewnątrz klienta Google. Jeśli wynik zapisu jest niepewny, retry całego zgłoszenia używa tego samego `requestId`; backend najpierw odczytuje istniejący rekord, a dopiero potem ewentualnie wykonuje kolejny append. Dzięki temu retry transportowy nie omija warstwy idempotencji.

## Browser headers

Aplikacja ustawia bazowe nagłówki bezpieczeństwa dla wszystkich tras:

- `Content-Security-Policy` ograniczone do `frame-ancestors`, `base-uri` i `form-action`,
- `X-Frame-Options: DENY`,
- `X-Content-Type-Options: nosniff`,
- `Referrer-Policy: strict-origin-when-cross-origin`,
- `Permissions-Policy` wyłącza nieużywane camera, microphone, geolocation i browsing topics.

Pełny CSP dla `script-src`/`style-src` nie jest dokładany na ślepo, ponieważ Next.js wymaga świadomej konfiguracji nonce/hash.
