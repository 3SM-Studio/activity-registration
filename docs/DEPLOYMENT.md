# Deployment

## Environments

```text
development -> memory albo TEST Sheet
preview     -> TEST Sheet
production  -> PROD Sheet
```

Preview nie może dostać produkcyjnego `GOOGLE_SPREADSHEET_ID` ani tożsamości mającej dostęp do PROD.

## Google resources

Przed pierwszym wdrożeniem Google-backed:

1. utwórz osobny arkusz TEST i osobny arkusz PROD,
2. włącz Google Sheets API,
3. dla OIDC/WIF włącz wymagane API IAM, Security Token Service i Service Account Credentials,
4. utwórz dedykowany service account dla aplikacji,
5. udostępnij konkretny arkusz temu service accountowi z minimalnym wymaganym dostępem,
6. utwórz Workload Identity Pool i provider dla Vercel OIDC,
7. mapuj `google.subject` z `assertion.sub`,
8. przyznaj `roles/iam.workloadIdentityUser` tylko dokładnym principalom Vercel, które mają impersonować service account.

Nie przyznawaj impersonacji całemu poolowi, jeśli można ograniczyć ją do konkretnego projektu i środowiska.

Vercel OIDC `sub` zawiera projekt i środowisko, więc PROD powinien być ograniczony do subjectu w rodzaju:

```text
owner:<team>:project:<project>:environment:production
```

Preview powinien używać osobnego principalu i arkusza TEST.

## Vercel environment values

```text
GCP_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_SERVICE_ACCOUNT_EMAIL
GCP_WORKLOAD_IDENTITY_POOL_ID
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
GOOGLE_SPREADSHEET_ID
DATA_BACKEND=google-sheets
APP_ENV=production
```

Produkcja nie używa JSON private key service account. Kod wymienia krótko żyjący token Vercel OIDC na credentials Google przez Workload Identity Federation i service account impersonation.

## Local development z Google

Preferowane są Application Default Credentials ograniczone do TEST. Realne dane produkcyjne nie są używane lokalnie.

## Flow

```text
feature branch
-> PR
-> CI
-> Vercel Preview z TEST
-> review
-> merge main
-> production
```

## Production gates

Przed produkcją muszą być zielone:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
```

Dodatkowo wymagane są zatwierdzone privacy notice i retention policy.
