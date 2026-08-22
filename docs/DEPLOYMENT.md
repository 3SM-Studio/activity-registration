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

Hotfix produkcyjny może wyjątkowo wejść bezpośrednio do `main`, ale po opanowaniu incydentu musi zostać zsynchronizowany z `preview`.

## Vercel branch deployment filtering

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

`scripts/repo-validate.mjs` pilnuje tego kontraktu.

## Canonical deployment rule

Przed testem produktu sprawdź:

```text
GitHub branch HEAD == odpowiedni Vercel deployment githubCommitSha
```

Dla QA używaj branch aliasu `preview`, nie przypadkowego feature deploymentu.

Nie uznawaj merge w GitHub za dowód wdrożenia, dopóki odpowiadający deployment Vercela nie ma stanu `READY`.

## Aktualny stan infrastruktury

Zweryfikowane 2026-08-22:

```text
Vercel project      pozytywka-activity-registration
Vercel project ID   prj_G9iXemQYiX8fuFkhHuSPTwZ8fQAa
Vercel team         atypicalmichas
Vercel framework    nextjs
Production branch   main
Preview branch      preview
GCP project         pozytywka-reg-3sm-260819
GCP project number  656375661462
```

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

`POWIADOMIENIA` is an additive technical outbox. It does not change the schema version stored on historical `ZAPISY` rows.

Both TEST and PROD must normally remain closed outside an explicitly controlled release/QA window.

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

The PROD Sheet ACL was rechecked on 2026-08-22 and contains the dedicated PROD application service account, not the TEST application service account. This verifies Sheet-level isolation, not the complete Google Cloud IAM surface.

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

Operational commands:

```bash
pnpm notifications:reconcile
pnpm notifications:retry
```

First deployment to an existing environment also requires a one-time closed-intake adoption:

```bash
pnpm notifications:adopt
```

Historical jobs are marked `SKIPPED`; adoption must not resend old mail. See `docs/NOTIFICATION_OUTBOX.md`.

## Preview environment

Canonical `preview` uses TEST-only configuration including TEST Sheet, TEST identity and Preview Resend secrets.

Do not manually set `VERCEL_OIDC_TOKEN`.

If canonical Preview lacks required TEST configuration, the application must fail closed instead of falling back to a fake memory success.

Outside controlled QA:

```text
TEST REGISTRATIONS_OPEN=FALSE
```

## Production environment

Production remains fail-closed until all blocking release gates are complete.

```text
PROD REGISTRATIONS_OPEN=FALSE
```

Do not use long-lived service-account JSON private keys. Production authentication uses Vercel OIDC/WIF and the dedicated PROD service account.

## Structural Sheet rollout

For an existing environment, intake must be closed before structural work.

Recommended order:

1. verify environment and Sheet ID,
2. verify `REGISTRATIONS_OPEN=FALSE`,
3. ensure no operator is concurrently editing structural Sheet metadata,
4. run the approved structural sync/migration,
5. validate headers/tables/protections,
6. for first outbox rollout, run safe historical adoption,
7. run `sheet:validate`, `diagnostics` and reconciliation,
8. keep intake closed until the environment-specific smoke is complete.

`sheet:bootstrap` is the routine-safe operator refresh path. `sheet:schema-sync` is the explicit structural maintenance path. Do not use them interchangeably.

## Production gates

Before public opening, all repository quality gates, Google validation, infrastructure isolation, privacy/retention requirements, child-protection organizational gates, operator access review and manual device/accessibility tests must be complete.

Only then may PROD `REGISTRATIONS_OPEN` become `TRUE`.
