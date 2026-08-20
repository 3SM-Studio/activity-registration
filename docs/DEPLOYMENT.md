# Deployment

## Environments

```text
development -> memory albo TEST Sheet przez lokalne ADC
preview     -> TEST Sheet przez TEST service account
production  -> PROD Sheet przez osobny PROD service account
```

Preview nie może dostać produkcyjnego `GOOGLE_SPREADSHEET_ID` ani tożsamości mającej dostęp do PROD.

## Branch model

```text
feat/*, fix/*, docs/*, chore/*
-> Pull Request do preview
-> GitHub CI
-> BEZ automatycznego deploymentu Vercel
-> merge do preview
-> stały Vercel Preview TEST
-> kontrolowany smoke/E2E
-> Pull Request preview -> main
-> CI
-> merge do main
-> Vercel Production
```

`preview` jest jedyną gałęzią Vercel Preview, która ma otrzymywać pełny TEST deployment aplikacji. Feature branche nie powinny zużywać quota Vercela i nie są kanonicznym środowiskiem QA.

Hotfix produkcyjny może wyjątkowo wejść bezpośrednio do `main`, ale po opanowaniu incydentu musi zostać zsynchronizowany z `preview`.

## Vercel branch deployment filtering

Vercel używa minimatch dla `git.deploymentEnabled`.

Prawidłowy kontrakt repo:

```json
{
  "git": {
    "deploymentEnabled": {
      "**": false,
      "preview": true,
      "main": true
    }
  }
}
```

Dlaczego `**`, a nie `*`:

- wcześniejsze `"*": false` nie obejmowało branchy zawierających `/`, np. `feat/...`, `fix/...`, `docs/...`,
- branche niepasujące do żadnej reguły Vercela domyślnie mają deployment włączony,
- efektem były niepotrzebne deploymenty praktycznie każdego technicznego commita i powtarzające się build-rate-limit,
- `"**": false` jest catch-all także dla branchy ze slashami,
- `preview` i `main` są jawnie ponownie włączone; przy nakładających się regułach Vercel deployuje, jeśli co najmniej jedna pasująca reguła ma `true`.

`scripts/repo-validate.mjs` pilnuje tego kontraktu, aby przypadkowa zmiana z powrotem na `*` nie wróciła.

Nie rozwiązuj problemów quota przez seryjne no-op commity.

## Canonical preview rule

Jedynym kanonicznym URL do QA jest stały alias `preview`.

Przed testem produktu należy sprawdzić:

```text
GitHub preview HEAD == canonical Vercel preview deployment git SHA
```

Jeżeli SHA są różne, środowisko ma deployment drift. Nie wolno mówić, że zmiana jest na preview tylko dlatego, że znajduje się w GitHubie.

## Aktualny stan infrastruktury

Zweryfikowane 2026-08-19:

```text
Vercel project      pozytywka-activity-registration
Vercel framework    nextjs
Production branch   main
Preview branch      preview
GCP project         pozytywka-reg-3sm-260819
GCP project number  656375661462
```

Google Sheets:

```text
TEST  11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8
PROD  1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38
```

Current runtime sheet contract is schema v2:

```text
MIASTA
OFERTY_ZAJEC
ZAPISY
USTAWIENIA
```

Target v3 adds `SEZONY` and `GRUPY` only through the explicit migration stage described in `docs/REGISTRATION_V3_PLAN.md`.

TEST contains a synthetic catalog. As part of v3 hygiene, registrations are kept closed outside controlled QA and manual/real-looking PII rows are removed after a full backup.

PROD remains fail-closed and must not be used during v3 development.

## Izolacja TEST i PROD

TEST and PROD must use different service accounts.

Current TEST service account:

```text
activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

It may access TEST Sheet only and is used by Vercel Preview.

PROD service account is still a pre-production gate. It must receive access to PROD only and must be bound only to the production Vercel subject.

Do not grant PROD Sheet access to the TEST service account.

## Google WIF

Pool/provider:

```text
pool:     vercel
provider: vercel
issuer:   https://oidc.vercel.com/atypicalmichas
```

Canonical audience:

```text
//iam.googleapis.com/projects/656375661462/locations/global/workloadIdentityPools/vercel/providers/vercel
```

Preview subject:

```text
owner:atypicalmichas:project:pozytywka-activity-registration:environment:preview
```

Production subject:

```text
owner:atypicalmichas:project:pozytywka-activity-registration:environment:production
```

Vercel OIDC `sub` does not encode the Git branch name, so the application still validates `VERCEL_GIT_COMMIT_REF` and only canonical `preview` may act as full TEST intake.

Detailed runbook: `docs/GCP_WIF_SETUP.md`.

## E-mail through Resend

After successful persistence the application can send:

1. participant confirmation,
2. admin notification.

E-mail failure does not roll back Registration. Notifications run after persistence and use stable idempotency keys.

This remains best-effort. Durable outbox/reconciliation is deferred hardening.

## Preview environment

Canonical `preview` uses TEST-only configuration including TEST Sheet, TEST identity and Preview Resend secrets.

Do not manually set `VERCEL_OIDC_TOKEN`.

If canonical preview lacks required TEST configuration, the application must fail closed instead of falling back to a fake memory success.

## Production environment

Production remains blocked until separate PROD identity/access, approved privacy/retention/legal gates, final catalog and production e-mail sender are ready.

## Local development with Google

Use Application Default Credentials / TEST identity only. Do not use long-lived JSON private keys.

## TEST operating rule

Outside an explicit controlled QA session:

```text
REGISTRATIONS_OPEN=FALSE
```

When opening TEST temporarily:

1. confirm canonical preview SHA,
2. use synthetic data,
3. run the planned smoke/integration flow,
4. clean the test row if the test does not already clean itself,
5. close TEST again.

## Production gates

Before production all repository quality gates, Google validation, infrastructure isolation, privacy/retention requirements, child-protection organizational gates, operator access review and manual device/accessibility tests must be complete.

Only then may PROD `REGISTRATIONS_OPEN` become `TRUE`.
