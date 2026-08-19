# Security Policy

## Supported version

Aktywnie wspierany jest aktualny kod na `main` oraz bieżące wdrożenia Preview używane do weryfikacji zmian przed merge.

## Zgłaszanie podatności

Nie publikuj sekretów, danych osobowych, aktywnych tokenów ani instrukcji umożliwiających nadużycie w publicznym Issue lub Discussion.

Preferowana ścieżka:

1. użyj prywatnego zgłoszenia podatności GitHub (`Report a vulnerability` / Security Advisory), jeśli opcja jest dostępna dla repozytorium,
2. jeżeli prywatne zgłoszenie GitHub nie jest dostępne, skontaktuj się z maintainerem poza publicznym trackerem pod `3stupidmenbusiness@gmail.com` i podaj tylko informacje potrzebne do reprodukcji.

W zgłoszeniu podaj:

- dotknięty commit/URL/endpoint,
- minimalny scenariusz reprodukcji,
- rzeczywisty wpływ,
- informację, czy doszło do ekspozycji sekretu lub PII.

## Sekrety

Każdy sekret, który trafił do publicznego repo, logu albo publicznego artefaktu, traktujemy jako ujawniony. Należy go unieważnić/obrócić, a dopiero potem usuwać ślady z kodu lub historii, jeśli jest to potrzebne.

Aplikacja nie używa długowiecznego JSON private key service account w Vercel. Tożsamość Google dla wdrożeń opiera się na OIDC/WIF, a TEST i PROD mają być odseparowane.

## Dane osobowe

Nie używaj realnych danych uczestników do testów. TEST ma korzystać wyłącznie z danych syntetycznych. Incydenty dotyczące PII nie mogą być opisywane z pełnym payloadem w publicznym issue.
