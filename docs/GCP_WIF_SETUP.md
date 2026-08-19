# GCP Workload Identity Federation dla systemu zapisów

Ten runbook opisuje zweryfikowany dostęp Vercel -> Google Sheets bez długowiecznych kluczy JSON service account.

## Aktualny stan

Zweryfikowane 2026-08-19 na publicznym Vercel Preview.

```text
GCP project ID      pozytywka-reg-3sm-260819
GCP project number  656375661462
Vercel team         atypicalmichas
Vercel project      pozytywka-activity-registration
Vercel project ID   prj_G9iXemQYiX8fuFkhHuSPTwZ8fQAa
Pool ID             vercel
Provider ID         vercel
```

TEST:

```text
Sheet ID             11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8
Service account      activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
Vercel environment   preview
```

PROD:

```text
Sheet ID             1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38
Service account      NIE UTWORZONY
Vercel environment   production
REGISTRATIONS_OPEN   FALSE
```

PROD nie jest jeszcze podłączony do runtime aplikacji.

## Zasada izolacji TEST i PROD

TEST i PROD muszą używać różnych service accountów.

Nie udostępniaj PROD Sheeta obecnemu kontu:

```text
activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

To konto jest tożsamością TEST/Preview. Gdyby dostało dostęp do PROD, Preview mogłoby uzyskać dostęp do produkcyjnego arkusza po impersonacji tej samej tożsamości.

Docelowo produkcja dostaje osobny service account, np.:

```text
activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

Dopiero ten osobny service account dostaje:

- dostęp do `Pozytywka - Zapisy PROD`,
- `roles/iam.workloadIdentityUser` dla subjectu Vercel `environment:production`.

## 1. API

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

Można go zawsze odczytać ponownie:

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

Kod aplikacji używa kanonicznego audience providera Google:

```text
//iam.googleapis.com/projects/656375661462/locations/global/workloadIdentityPools/vercel/providers/vercel
```

To samo audience musi być dopuszczone w konfiguracji providera. Nie używaj tutaj `https://vercel.com/atypicalmichas`.

Tworzenie nowego providera od zera:

```bash
PROJECT_ID="pozytywka-reg-3sm-260819"
GCP_PROJECT_NUMBER="656375661462"
POOL_ID="vercel"
PROVIDER_ID="vercel"
GCP_AUDIENCE="//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --display-name="Vercel" \
  --description="Vercel OIDC for Pozytywka registration"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --display-name="Vercel" \
  --issuer-uri="https://oidc.vercel.com/atypicalmichas" \
  --allowed-audiences="$GCP_AUDIENCE" \
  --attribute-mapping="google.subject=assertion.sub"
```

Jeżeli provider już istnieje i trzeba naprawić audience:

```bash
GCP_AUDIENCE="//iam.googleapis.com/projects/656375661462/locations/global/workloadIdentityPools/vercel/providers/vercel"

gcloud iam workload-identity-pools providers update-oidc vercel \
  --project="pozytywka-reg-3sm-260819" \
  --location=global \
  --workload-identity-pool=vercel \
  --allowed-audiences="$GCP_AUDIENCE"
```

Weryfikacja:

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

## 3. Preview principal

Vercel `sub` dla działającego Preview:

```text
owner:atypicalmichas:project:pozytywka-activity-registration:environment:preview
```

Binding istnieje na TEST service account:

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

## 4. Production principal, dopiero przed PROD

Najpierw utwórz osobny service account:

```bash
PROJECT_ID="pozytywka-reg-3sm-260819"

gcloud iam service-accounts create activity-registration-prod \
  --project="$PROJECT_ID" \
  --display-name="Pozytywka Activity Registration PROD" \
  --description="Production-only Google Sheets identity for Pozytywka registrations"
```

Następnie binduj wyłącznie subject produkcyjny:

```bash
GCP_PROJECT_NUMBER="656375661462"
PROD_SA_EMAIL="activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com"
PROD_SUBJECT="owner:atypicalmichas:project:pozytywka-activity-registration:environment:production"

gcloud iam service-accounts add-iam-policy-binding "$PROD_SA_EMAIL" \
  --project="pozytywka-reg-3sm-260819" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principal://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/vercel/subject/${PROD_SUBJECT}"
```

Nie dodawaj subjectu `environment:production` do TEST service accountu.

## 5. Google Drive / Sheets permissions

Aktualnie:

- TEST Sheet jest udostępniony TEST service accountowi jako `writer`,
- PROD Sheet nie jest udostępniony TEST service accountowi.

Przed produkcją udostępnij PROD Sheet wyłącznie PROD service accountowi.

Nie udostępniaj całego folderu ani całego prywatnego Drive.

## 6. Vercel Preview env

Aktualny Preview dla `feat/production-integrations` używa:

```text
APP_ENV=test
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8

EMAIL_PROVIDER=resend
EMAIL_FROM=Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>
REGISTRATION_ADMIN_EMAILS=3stupidmenbusiness@gmail.com
RESEND_API_KEY=<Sensitive, Preview>

GCP_PROJECT_ID=pozytywka-reg-3sm-260819
GCP_PROJECT_NUMBER=656375661462
GCP_SERVICE_ACCOUNT_EMAIL=activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
ALLOW_TEST_SEED=false
```

Nie ustawiaj ręcznie `VERCEL_OIDC_TOKEN` na Vercelu. Runtime otrzymuje token OIDC od Vercela.

Lokalnie używamy ADC, dlatego lokalny `.env.local` nie powinien zawierać `VERCEL_OIDC_TOKEN`.

## 7. Vercel Production env, przyszły stan

Dopiero po utworzeniu osobnego PROD service accountu:

```text
APP_ENV=production
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38

EMAIL_PROVIDER=resend
RESEND_API_KEY=<production secret>
EMAIL_FROM=<verified production sender>
REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com

GCP_PROJECT_ID=pozytywka-reg-3sm-260819
GCP_PROJECT_NUMBER=656375661462
GCP_SERVICE_ACCOUNT_EMAIL=activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
ALLOW_TEST_SEED=false
```

## 8. Zweryfikowany Preview E2E

2026-08-19 zweryfikowano:

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

Po poprawieniu `allowedAudiences` nowe requesty `GET /` nie generowały już `invalid_grant`.

Mail uczestnika został potwierdzony w skrzynce Gmail. Log `registration.notifications.succeeded` oznacza, że obie próby wysyłki zostały przyjęte przez warstwę Resend bez błędu. Nie jest to dowód mailbox delivery wiadomości administracyjnej.

## 9. Gate przed PROD

Przed dodaniem production bindingu i otwarciem zapisów:

- utwórz osobny PROD service account,
- udostępnij mu wyłącznie PROD Sheet,
- dodaj wyłącznie production subject,
- wprowadź prawdziwy katalog zajęć,
- zatwierdź privacy notice i jej wersję,
- zatwierdź retention policy,
- skonfiguruj produkcyjnego nadawcę i odbiorcę administracyjnego,
- wykonaj kontrolowany smoke test przy `REGISTRATIONS_OPEN=FALSE` tam, gdzie to możliwe,
- dopiero na końcu ustaw `REGISTRATIONS_OPEN=TRUE`.

## Źródła

- Vercel: OIDC, Google Cloud Platform integration
- Google Cloud: Workload Identity Federation for deployment pipelines
- Google Cloud SDK: workload identity pools provider OIDC commands
