# Release checklist

## Product

- [ ] miasta zatwierdzone przez Pozytywkę
- [ ] oferty zatwierdzone przez Pozytywkę
- [ ] success copy zatwierdzone
- [ ] finalny publiczny adres/domena formularza zatwierdzona
- [ ] warstwa wizualna zaakceptowana

## Google Sheets

- [x] osobne TEST i PROD
- [x] TEST Sheet działa z Vercel Preview przez WIF
- [ ] `sheet:validate` przechodzi na finalnym PROD
- [ ] `diagnostics` przechodzi na finalnym PROD
- [x] techniczne kolumny `ZAPISY` mają warning-only protection; `STATUS` i `NOTES` pozostają operacyjne
- [ ] dostęp do PROD ograniczony do zatwierdzonych operatorów i PROD service accountu
- [x] TEST service account nie ma dostępu do PROD Sheet
- [x] PROD `REGISTRATIONS_OPEN` jest obecnie `FALSE` i pozostaje zamknięte do ostatniego gate

## Privacy

- [ ] privacy notice zatwierdzona
- [ ] `PRIVACY_NOTICE_URL` ustawione w PROD
- [ ] `PRIVACY_NOTICE_VERSION` ustawione w PROD
- [ ] retencja zatwierdzona
- [ ] procedura retencji zapisana operacyjnie

## Security

- [x] brak private key service account w repo/env flow
- [x] Preview OIDC/WIF działa
- [x] repo jest świadomie publiczne
- [x] `.env*` jest ignorowane z wyjątkiem `.env.example`
- [x] input/select boundary contrast został wzmocniony
- [x] focus ring ma kontrastowy wariant zamiast niskiej alpha
- [x] select zachowuje natywny affordance
- [ ] osobny PROD service account utworzony
- [ ] production WIF subject bindnięty wyłącznie do PROD service accountu
- [ ] preview nie ma dostępu do PROD identity
- [ ] finalny log review nie wykazuje PII
- [ ] wcześniej ujawniony/testowy Resend key jest unieważniony i PROD używa aktualnego sekretu

## Email

- [x] participant confirmation działa na TEST
- [x] admin notification request działa na TEST
- [ ] mailbox delivery admin notification potwierdzona
- [ ] produkcyjny sender Resend zatwierdzony
- [ ] `REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com`

## UX / accessibility

- [x] E2E desktop przechodzi
- [x] E2E 320 px przechodzi
- [x] E2E 430 px przechodzi
- [x] automatyczny test braku horizontal overflow przechodzi
- [x] automatyczny test focusu pierwszego błędnego pola przechodzi
- [x] same-requestId retry po temporary failure przechodzi w E2E
- [ ] ręczny pełny flow klawiaturą przechodzi
- [ ] widoczność focus ringów potwierdzona ręcznie
- [ ] zoom/reflow i kontrast sprawdzone ręcznie w przeglądarce
- [ ] real-device mobile smoke test przechodzi

## Engineering

- [x] `pnpm-lock.yaml` istnieje
- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm check`
- [x] 14/14 Vitest files, 67/67 tests
- [x] Next.js production build
- [x] `pnpm test:e2e`, 21/21 Playwright tests
- [x] CI #53 green dla zweryfikowanego code head `367b4c5`; późniejsze zmiany są docs-only
- [ ] `APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm test:integration:sheets` uruchomione na realnym TEST
- [x] dokumentacja zsynchronizowana z aktualnym zachowaniem i decyzją o publicznym repo
- [ ] PR #1 zaakceptowany i zmergowany w poprawnej kolejności
- [ ] PR #2 po retarget/rebase ma green CI

## Production

- [ ] komplet Vercel Production env ustawiony
- [ ] Production używa PROD Sheet i osobnej PROD identity
- [ ] kontrolowany smoke test przy `REGISTRATIONS_OPEN=FALSE`
- [ ] finalny test formularza bez zaśmiecania PROD
- [ ] wszystkie powyższe gate'y są zamknięte
- [ ] dopiero wtedy `REGISTRATIONS_OPEN=TRUE`
