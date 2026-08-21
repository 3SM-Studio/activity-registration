# GCP Workload Identity Federation dla systemu zapisów

Ten runbook opisuje aktualny, zweryfikowany dostęp Vercel -> Google Sheets bez długowiecznych kluczy JSON service account.

Stan zaktualizowany: 2026-08-21.

## Aktualny stan

```text
GCP project ID      pozytywka-reg-3sm-260819
GCP project number  656375661462
Vercel team         atypicalmichas
Vercel project      pozytywka-activity-registration
Vercel project ID   prj_G9iXemQYiX8fuFkhHuSPTwZ8fQAa
Pool ID             vercel
Provider ID         vercel
Issuer              https://oidc.vercel.com/atypicalmichas
```

TEST / Preview:

```text
Sheet ID             11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8
Service account      activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
Vercel environment   preview
Vercel branch         preview
```

PROD:

```text
Sheet ID             1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM
Service account      activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
Vercel environment   production
SYSTEM_SCHEMA_VERSION 4
REGISTRATIONS_OPEN   FALSE
```

Production jest podłączony do runtime aplikacji. Realny zapis z Vercel Production został zweryfikowany w kanonicznym PROD Sheet. Po migracji schema v4 Production nadal działa z zamkniętymi zapisami.

## Zasada izolacji TEST i PROD

TEST i PROD używają różnych service accountów.

TEST identity:

```text
activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

PROD identity:

```text
activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

Zweryfikowane 2026-08-21:

- TEST Sheet ma TEST service account jako `writer`,
- TEST Sheet nie ma PROD service account,
- PROD Sheet ma dedykowany PROD service account jako `writer`,
- PROD Sheet nie ma TEST/general service account,
- nie udostępniamy całego prywatnego Drive ani wspólnego folderu obu identity.

## 1. Wymagane API

```bash
PROJECT_ID="pozytywka-reg-3sm-260819"

gcloud config set project "$PROJECT_ID"

gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  sheets.googleapis.com \
  --project="$PROJECT_ID"
```

Projekt ma numer:

```text
656375661462
```

Weryfikacja:

```bash
GCP_PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
echo "$GCP_PROJECT_NUMBER"
```

## 2. Workload Identity Pool i provider

Vercel działa w Team issuer mode:

```text
issuer: https://oidc.vercel.com/atypicalmichas
```

Pool i provider:

```text
pool:     vercel
provider: vercel
```

Kanoniczny audience providera Google:

```text
//iam.googleapis.com/projects/656375661462/locations/global/workloadIdentityPools/vercel/providers/vercel
```

Weryfikacja providera:

```bash
gcloud iam workload-identity-pools providers describe vercel \
  --project="pozytywka-reg-3sm-260819" \
  --location=global \
  --workload-identity-pool=vercel \
  --format="yaml(state,oidc.issuerUri,oidc.allowedAudiences)"
```

Oczekiwane:

```yaml
state: ACTIVE
oidc:
  issuerUri: https://oidc.vercel.com/atypicalmichas
  allowedAudiences:
    - //iam.googleapis.com/projects/656375661462/locations/global/workloadIdentityPools/vercel/providers/vercel
```

Nie używaj jako audience `https://vercel.com/atypicalmichas`.

## 3. Preview principal

Kanoniczny subject Preview:

```text
owner:atypicalmichas:project:pozytywka-activity-registration:environment:preview
```

Binding ma istnieć wyłącznie na TEST service account:

```bash
PROJECT_ID="pozytywka-reg-3sm-260819"
GCP_PROJECT_NUMBER="656375661462"
TEST_SA_EMAIL="activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com"
PREVIEW_SUBJECT="owner:atypicalmichas:project:pozytywka-activity-registration:environment:preview"

gcloud iam service-accounts add-iam-policy-binding "$TEST_SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principal://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/vercel/subject/${PREVIEW_SUBJECT}"
```

Nie przyznawaj `roles/iam.workloadIdentityUser` całemu poolowi.

## 4. Production principal

Kanoniczny subject Production:

```text
owner:atypicalmichas:project:pozytywka-activity-registration:environment:production
```

Binding ma istnieć wyłącznie na PROD service account:

```bash
GCP_PROJECT_NUMBER="656375661462"
PROD_SA_EMAIL="activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com"
PROD_SUBJECT="owner:atypicalmichas:project:pozytywka-activity-registration:environment:production"

gcloud iam service-accounts add-iam-policy-binding "$PROD_SA_EMAIL" \
  --project="pozytywka-reg-3sm-260819" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principal://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/vercel/subject/${PROD_SUBJECT}"
```

Nie dodawaj subjectu `environment:production` do TEST service accountu. Nie dodawaj subjectu `environment:preview` do PROD service accountu.

## 5. Google Drive / Sheets permissions

Kanoniczny stan:

- TEST Sheet `11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8` jest udostępniony TEST service accountowi jako `writer`,
- PROD Sheet `1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM` jest udostępniony wyłącznie aplikacyjnemu PROD service accountowi jako `writer`,
- TEST service account nie ma dostępu do PROD Sheet,
- PROD service account nie ma dostępu do TEST Sheet,
- general access PROD Sheet jest `Restricted`.

## 6. Vercel Preview env

Canonical Preview używa:

```text
APP_ENV=test
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8

EMAIL_PROVIDER=resend
EMAIL_FROM=Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>
RESEND_API_KEY=<Sensitive, Preview>

GCP_PROJECT_ID=pozytywka-reg-3sm-260819
GCP_PROJECT_NUMBER=656375661462
GCP_SERVICE_ACCOUNT_EMAIL=activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
ALLOW_TEST_SEED=false
```

Nie ustawiaj ręcznie `VERCEL_OIDC_TOKEN`. Runtime otrzymuje token OIDC od Vercela.

Lokalnie używamy ADC, dlatego lokalny `.env.local` nie powinien zawierać `VERCEL_OIDC_TOKEN`.

## 7. Vercel Production env

Kanoniczny Production używa:

```text
APP_ENV=production
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM

EMAIL_PROVIDER=resend
RESEND_API_KEY=<Sensitive, Production>
EMAIL_FROM=Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>
REGISTRATION_ADMIN_EMAILS=michal.szwindowski@gmail.com

GCP_PROJECT_ID=pozytywka-reg-3sm-260819
GCP_PROJECT_NUMBER=656375661462
GCP_SERVICE_ACCOUNT_EMAIL=activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
ALLOW_TEST_SEED=false
ALLOW_PRODUCTION_CATALOG_SEED=false
```

Kod runtime i `scripts/validate-production-env.ts` egzekwują kanoniczny PROD Sheet, dedykowany PROD service account i zatwierdzony techniczny odbiorca administracyjny.

## 8. Zweryfikowany Preview E2E i finalny HEAD read

2026-08-19 zweryfikowano pełną ścieżkę TEST:

```text
Vercel Preview
-> Vercel OIDC
-> Google STS / WIF
-> TEST service account
-> Google Sheets TEST read
-> POST /api/registrations 201
-> Google Sheets TEST write
-> Resend participant notification
-> Resend admin notification request
```

2026-08-21 branch `preview` został fast-forwardowany do finalnego SHA aplikacji:

```text
caafa3184b61727ab9f05a4bedc6162b4935d926
```

Deployment:

```text
dpl_EQTR2YFkDZLJL2DqxypYEjivTq2R
```

osiągnął `READY`. GET do canonical Preview zwrócił dokładne ustawienia TEST Sheet:

```text
CURRENT_SEASON_ID=test-2026-2027
PRIVACY_NOTICE_VERSION=test-2026-08-18
REGISTRATIONS_OPEN=FALSE
```

W tym samym oknie nie było warning/error/fatal runtime logs. To jest finalny dowód, że aktualny HEAD potrafi uwierzytelnić się przez Preview WIF i czytać izolowany TEST Sheet.

## 9. Zweryfikowany Production runtime

Production działa na finalnym hotfix SHA:

```text
caafa3184b61727ab9f05a4bedc6162b4935d926
```

Deployment:

```text
dpl_7EGyhKvLskZXqDzL5fwkoQ9QmzLe
```

Po migracji PROD Sheet do schema v4 zweryfikowano:

- `SYSTEM_SCHEMA_VERSION=4`,
- `REGISTRATIONS_OPEN=FALSE`,
- zachowanie istniejącego rekordu,
- natywny Table dropdown `ASSIGNED_GROUP_ID`,
- `PANEL_OPERATORA`,
- 12 reguł operatorskiego formatowania warunkowego,
- cztery widoki operatorskie,
- pięć pomocniczych natywnych Tables,
- HTTP 200 z zamkniętym formularzem,
- brak warning/error/fatal runtime logs w oknie weryfikacji.

## 10. Pozostałe gate'y przed otwarciem PROD

Przed `REGISTRATIONS_OPEN=TRUE` nadal trzeba:

- fizycznie wywiesić pełne i skrócone Standardy v1.1 w siedzibie,
- wykonać real-device QA na Android Chrome i iPhone Safari,
- wykonać keyboard/focus/200% zoom/reflow i finalny human visual review,
- wykonać operator QA na prawdziwym katalogu PROD,
- wykonać możliwe environment-specific command checks bez tworzenia publicznego debug endpointu,
- niezależnie przejrzeć szerszy IAM/Drive scope PROD service accountu pod least privilege.

Dopiero po tych gate'ach ustawiamy `REGISTRATIONS_OPEN=TRUE` i wykonujemy finalny live smoke.

## Źródła

- Vercel: OIDC, Google Cloud Platform integration
- Google Cloud: Workload Identity Federation for deployment pipelines
- Google Cloud SDK: workload identity pools provider OIDC commands
