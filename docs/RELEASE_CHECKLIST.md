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
- [ ] dostęp do PROD ograniczony do właściwych osób i PROD service accountu
- [ ] TEST service account nie ma dostępu do PROD Sheet
- [ ] `REGISTRATIONS_OPEN` pozostaje `FALSE` do ostatniego release gate

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
- [ ] osobny PROD service account utworzony
- [ ] production WIF subject bindnięty wyłącznie do PROD service accountu
- [ ] preview nie ma dostępu do PROD
- [ ] finalny log review nie wykazuje PII
- [ ] wcześniej ujawniony/testowy Resend key jest unieważniony i PROD używa aktualnego sekretu

## Email

- [x] participant confirmation działa na TEST
- [x] admin notification request działa na TEST
- [ ] mailbox delivery admin notification potwierdzona
- [ ] produkcyjny sender Resend zatwierdzony
- [ ] `REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com`

## UX / accessibility

- [ ] E2E desktop przechodzi na finalnym head
- [ ] E2E 320 px przechodzi na finalnym head
- [ ] E2E 430 px przechodzi na finalnym head
- [ ] brak horizontal overflow
- [ ] focus pierwszego błędnego pola działa
- [ ] ręczny pełny flow klawiaturą przechodzi
- [ ] focus ringi są widoczne
- [ ] kontrast i komunikaty błędów sprawdzone
- [ ] real-device mobile smoke test przechodzi

## Engineering

- [x] `pnpm-lock.yaml` istnieje
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm check`
- [ ] `pnpm test:e2e`
- [ ] CI green na finalnym head
- [ ] `APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm test:integration:sheets`
- [ ] dokumentacja odpowiada finalnemu zachowaniu kodu
- [ ] PR #1 zaakceptowany i zmergowany w poprawnej kolejności
- [ ] PR #2 po retarget/rebase ma green CI

## Production

- [ ] komplet Vercel Production env ustawiony
- [ ] Production używa PROD Sheet i PROD identity
- [ ] kontrolowany smoke test przy `REGISTRATIONS_OPEN=FALSE`
- [ ] finalny test formularza bez zaśmiecania PROD
- [ ] wszystkie powyższe gate'y są zamknięte
- [ ] dopiero wtedy `REGISTRATIONS_OPEN=TRUE`
