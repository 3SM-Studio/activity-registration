# Release checklist

## Product

- [ ] miasta zatwierdzone
- [ ] oferty zatwierdzone
- [ ] success copy zatwierdzone
- [ ] mobile smoke test

## Google Sheets

- [ ] osobne TEST i PROD
- [ ] `sheet:validate` przechodzi
- [ ] `diagnostics` przechodzi
- [ ] dostęp do PROD ograniczony
- [ ] REGISTRATIONS_OPEN świadomie ustawione

## Privacy

- [ ] privacy notice zatwierdzona
- [ ] PRIVACY_NOTICE_URL ustawione
- [ ] PRIVACY_NOTICE_VERSION ustawione
- [ ] retencja zatwierdzona

## Security

- [ ] brak private key service account
- [ ] OIDC/WIF działa
- [ ] preview nie ma dostępu do PROD
- [ ] log review nie wykazuje PII

## Engineering

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm check`
- [ ] `pnpm test:e2e`
- [ ] CI green
- [ ] production smoke test
