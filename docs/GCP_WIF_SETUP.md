# GCP Workload Identity Federation dla systemu zapisów

Ten runbook konfiguruje dostęp Vercel -> Google Sheets bez długowiecznego klucza JSON service account.

## Założenia

- Vercel team slug: `atypicalmichas`
- issuer w trybie Team: `https://oidc.vercel.com/atypicalmichas`
- audience: `https://vercel.com/atypicalmichas`
- pool ID: `vercel`
- provider ID: `vercel`
- service account ID: `pozytywka-registration`
- TEST Sheet: `11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8`
- PROD Sheet: `1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38`

`<GCP_PROJECT_ID>` i `<VERCEL_PROJECT_NAME>` muszą zostać zastąpione realnymi wartościami.

## 1. Wybór projektu i API

```bash
gcloud auth login
gcloud config set project <GCP_PROJECT_ID>

gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  sheets.googleapis.com
```

Pobierz numer projektu:

```bash
GCP_PROJECT_NUMBER="$(gcloud projects describe <GCP_PROJECT_ID> --format='value(projectNumber)')"
echo "$GCP_PROJECT_NUMBER"
```

## 2. Service account

```bash
gcloud iam service-accounts create pozytywka-registration \
  --display-name="Pozytywka registration system"

SERVICE_ACCOUNT_EMAIL="pozytywka-registration@<GCP_PROJECT_ID>.iam.gserviceaccount.com"
```

Nie nadajemy temu kontu szerokiej roli projektowej tylko po to, aby używało Google Sheets. Dostęp do konkretnych arkuszy nadajemy przez udostępnienie pliku w Google Drive.

## 3. Workload Identity Pool

```bash
gcloud iam workload-identity-pools create vercel \
  --location=global \
  --display-name="Vercel" \
  --description="Vercel OIDC for Pozytywka registration system"
```

## 4. Provider OIDC

```bash
gcloud iam workload-identity-pools providers create-oidc vercel \
  --location=global \
  --workload-identity-pool=vercel \
  --display-name="Vercel" \
  --issuer-uri="https://oidc.vercel.com/atypicalmichas" \
  --allowed-audiences="https://vercel.com/atypicalmichas" \
  --attribute-mapping="google.subject=assertion.sub"
```

## 5. Ograniczenie impersonacji do konkretnego projektu Vercel

Vercel `sub` ma postać opartą o owner, project i environment. Nie przyznawaj `roles/iam.workloadIdentityUser` całemu poolowi.

Preview:

```bash
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="principal://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/vercel/subject/owner:atypicalmichas:project:<VERCEL_PROJECT_NAME>:environment:preview"
```

Production:

```bash
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="principal://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/vercel/subject/owner:atypicalmichas:project:<VERCEL_PROJECT_NAME>:environment:production"
```

## 6. Udostępnienie arkuszy

Po utworzeniu service account udostępnij mu jako `Editor` wyłącznie:

- `Pozytywka - Zapisy TEST`
- `Pozytywka - Zapisy PROD`

Nie udostępniaj całego prywatnego Drive ani folderów niezwiązanych z systemem.

## 7. Vercel Preview

```text
APP_ENV=test
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8
EMAIL_PROVIDER=disabled
GCP_PROJECT_ID=<GCP_PROJECT_ID>
GCP_PROJECT_NUMBER=<GCP_PROJECT_NUMBER>
GCP_SERVICE_ACCOUNT_EMAIL=<SERVICE_ACCOUNT_EMAIL>
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
```

## 8. Vercel Production

```text
APP_ENV=production
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38
EMAIL_PROVIDER=resend
RESEND_API_KEY=<secret>
EMAIL_FROM=<verified sender>
REGISTRATION_ADMIN_EMAILS=<real Pozytywka address>
GCP_PROJECT_ID=<GCP_PROJECT_ID>
GCP_PROJECT_NUMBER=<GCP_PROJECT_NUMBER>
GCP_SERVICE_ACCOUNT_EMAIL=<SERVICE_ACCOUNT_EMAIL>
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
```

## 9. Gate przed otwarciem PROD

Najpierw TEST:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
```

Następnie wykonaj pełny zapis przez preview i sprawdź, że pojawił się dokładnie jeden rekord w `ZAPISY` TEST.

PROD pozostaje z `REGISTRATIONS_OPEN=FALSE` do chwili zatwierdzenia prawdziwego katalogu, privacy notice, retencji oraz konfiguracji e-mail.

## Źródła

- Vercel: Connect to Google Cloud Platform (GCP), OIDC federation
- Google Cloud: Configure Workload Identity Federation with deployment pipelines
- Google Cloud SDK: `gcloud iam workload-identity-pools providers create-oidc`
