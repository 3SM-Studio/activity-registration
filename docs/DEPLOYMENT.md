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
-> merge do preview
-> kanoniczny Vercel Preview TEST
-> kontrolowany smoke/E2E
-> Pull Request preview -> main
-> GitHub CI
-> merge do main
-> Vercel Production
```

`preview` jest jedyną gałęzią Vercel Preview, która ma otrzymywać pełny TEST deployment aplikacji. Feature branches są wyłączone przez `vercel.json`.

Hotfix produkcyjny może wyjątkowo wejść bezpośrednio do `main`, ale po opanowaniu incydentu musi zostać zsynchronizowany z `preview` przez chroniony PR.

## GitHub protection

Aktywny ruleset `Protect main and preview` obejmuje dokładnie `main` i `preview` i wymaga:

- Pull Request,
- statusu `check`,
- statusu `webkit`,
- branch up-to-date przed merge,
- rozwiązania review conversations,
- squash merge,
- braku force push,
- braku usuwania chronionych gałęzi.

Ruleset nie ma bypass actors.

## Canonical deployment rule

Przed uznaniem wdrożenia za poprawne sprawdź:

```text
GitHub branch HEAD == odpowiedni Vercel deployment githubCommitSha
```

Nie uznawaj merge w GitHub za dowód wdrożenia, dopóki odpowiadający deployment Vercela nie ma stanu `READY`.

Nie zapisuj bieżącego `main` HEAD w dokumentacji jako trwałej stałej. Docs-only merge również przesuwa HEAD i może tworzyć Production deployment bez zmiany runtime aplikacji. Poniższe identyfikatory są evidence konkretnego runtime-changing launchu, nie aliasem „zawsze aktualnego” deploymentu.

## Launch-hardening runtime evidence

Zweryfikowane 2026-08-30:

```text
Vercel project         pozytywka-activity-registration
Vercel project ID      prj_G9iXemQYiX8fuFkhHuSPTwZ8fQAa
Production branch      main
Preview branch         preview
Runtime-changing SHA   5d8628f5bf908b304dcfc172c95d2b8a5c1244f6
Runtime deployment     dpl_5zQbApatboZBQp3J2CX63KT4fn1w
Deployment state       READY
Next.js                16.3.3
REGISTRATIONS_OPEN     TRUE
```

Production build dla launch hardeningu przeszedł:

```text
prod:env:validate   PASS
sheet:validate      PASS, warnings=[]
diagnostics         PASS
Next.js build       PASS
post-deploy GET     HTTP 200
cron unauthorized   HTTP 401
runtime errors      no new warning/error/fatal cluster found
```

Po zweryfikowanym closed-state smoke `REGISTRATIONS_OPEN` został ustawiony na `TRUE` jako finalna kontrolowana zmiana w `USTAWIENIA`.

Późniejsze docs-only merge mogą mieć nowszy SHA i deployment. Ich aktualny stan należy sprawdzać bezpośrednio w GitHub i Vercel.

Google Sheets:

```text
TEST  11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8
PROD  1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM
```

Current runtime contract:

```text
SYSTEM_SCHEMA_VERSION=4
MIASTA
SEZONY
OFERTY_ZAJEC
GRUPY
ZAPISY
POWIADOMIENIA
USTAWIENIA
PANEL_OPERATORA  # derived dashboard, not a native Table
```

## Izolacja TEST i PROD

TEST service account:

```text
activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

PROD service account:

```text
activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

Preview uses the TEST identity. Production uses the dedicated PROD identity. The TEST service account must not have access to the PROD Sheet.

The PROD Sheet ACL contains the dedicated PROD application service account and not the TEST application service account. This verifies Sheet-level isolation, not the complete Google Cloud IAM surface.

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

Vercel OIDC `sub` does not encode the Git branch name, so the application also validates `VERCEL_GIT_COMMIT_REF` and only canonical `preview` may act as full TEST intake.

Detailed runbook: `docs/GCP_WIF_SETUP.md`.

## E-mail and durable outbox

After successful Registration persistence the application maintains two technical jobs:

1. participant confirmation,
2. admin notification.

A provider failure does not roll back Registration. The job remains durable and can be retried/reconciled.

The first delivery attempt happens immediately after successful Registration. Production also exposes a secured recovery endpoint:

```text
GET /api/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

`CRON_SECRET` exists only in the Vercel Production environment and is not stored in Git.

Current Vercel plan is Hobby, therefore the platform recovery cron runs once daily. Operational commands remain available:

```bash
pnpm notifications:reconcile
pnpm notifications:retry
```

`notifications:adopt` was a one-time historical rollout operation and must not be repeated on current PROD.

See `docs/NOTIFICATION_OUTBOX.md`.

## Preview environment

Canonical `preview` uses TEST-only configuration including TEST Sheet, TEST identity and Preview Resend secrets.

Do not manually set `VERCEL_OIDC_TOKEN`.

If canonical Preview lacks required TEST configuration, the application must fail closed instead of falling back to a fake memory success.

Outside controlled QA:

```text
TEST REGISTRATIONS_OPEN=FALSE
```

## Production environment

Production is live. Closing and opening intake remains a controlled operational switch independent of code deployment.

Normal emergency-close procedure:

1. set PROD `REGISTRATIONS_OPEN=FALSE`,
2. verify closed-state HTTP 200,
3. perform code/environment/data maintenance,
4. run Production gate and smoke,
5. set `REGISTRATIONS_OPEN=TRUE` only after the verified state is acceptable.

Do not use long-lived service-account JSON private keys. Production authentication uses Vercel OIDC/WIF and the dedicated PROD service account.

## Structural Sheet rollout

For an existing environment, intake must be closed before structural work.

Recommended order:

1. verify environment and Sheet ID,
2. verify `REGISTRATIONS_OPEN=FALSE`,
3. ensure no operator is concurrently editing structural Sheet metadata,
4. run the approved structural sync/migration,
5. validate headers/tables/protections,
6. run `sheet:validate`, `diagnostics` and reconciliation,
7. perform closed-state smoke,
8. reopen intake only after postconditions pass.

`sheet:bootstrap` is the routine-safe operator refresh path. `sheet:schema-sync` is the explicit structural maintenance path. Do not use them interchangeably.

## Residual post-launch work

The current launch is not claimed to solve long-term architectural limitations. Remaining items are tracked in `docs/AUDIT_REMEDIATION_2026-08-30.md`, especially:

- wider Google Cloud IAM review,
- human/device/accessibility acceptance,
- GitHub security-default review,
- migration planning from Sheets transactional core to PostgreSQL,
- stronger alerting, backup/restore and audit-trail architecture.
