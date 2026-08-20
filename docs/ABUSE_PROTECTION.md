# Abuse protection

This document defines the v3 abuse-protection decision for the public registration endpoint.

The goal is to reduce spam and automated request volume without turning a short parent-facing form into a CAPTCHA-first experience and without adding participant PII to monitoring.

## 1. Existing application controls

Keep the current controls:

- JSON-only `POST /api/registrations`,
- 16 KiB request-body limit,
- Zod validation,
- hidden honeypot field,
- minimum form-fill time,
- request ID idempotency,
- business duplicate detection,
- PII-safe structured logs,
- Vercel platform DDoS protection.

Business duplicate detection is not rate limiting. An attacker can vary participant data and still generate work.

## 2. Primary v3 rate-limiting decision

Use **Vercel WAF Rate Limiting** as the primary volume-control layer for the registration endpoint.

Initial rule:

```text
Name: Pozytywka registration POST rate limit

When:
  HTTP method = POST
  AND request path = /api/registrations

Count by:
  IP

Limit:
  20 requests per 60 seconds

Then:
  return 429 Too Many Requests
```

Why this is the preferred first layer:

- it runs before the application and Google Sheets write path,
- it is shared across distributed Vercel compute rather than relying on per-process memory,
- it adds no form widget or new browser-side challenge to normal traffic,
- it does not require storing participant data in a rate-limit database,
- it protects downstream Google Sheets and Resend usage from simple bursts.

The threshold is an initial operational value, not a permanent business constant. Review WAF traffic after launch and adjust if legitimate shared-network traffic is affected or abusive traffic still passes easily.

Do not implement an in-memory application rate limiter in a Vercel Function and describe it as a global limit. Function instances are distributed and ephemeral.

## 3. Rollout procedure

The WAF rule is platform configuration and is not created by application source code.

Before public production opening:

1. Create the rule in the Vercel project Firewall.
2. Start with a controlled verification while registrations are closed.
3. Confirm ordinary requests still reach the application.
4. Send a controlled burst from one test source while `REGISTRATIONS_OPEN=FALSE` so the test cannot create registration rows.
5. Confirm the threshold produces HTTP `429` and the application/Google write path is not reached after the limit is active.
6. Inspect the Vercel Firewall traffic view for the rule.
7. Record the verified rule and date in the release evidence.

Do not test the limiter by creating many synthetic rows in PROD.

## 4. Turnstile decision

Do **not** add Cloudflare Turnstile to the normal v3 form by default.

Turnstile becomes the next escalation if one or more of these are observed:

- distributed bot traffic bypasses the IP rate limit,
- spam remains operationally significant despite honeypot/minimum-fill-time/WAF,
- attack traffic rotates source IPs fast enough that the WAF rule is ineffective,
- downstream Google Sheets or e-mail usage remains exposed to meaningful automated abuse.

If Turnstile is introduced later:

- use a managed/non-intrusive mode first,
- validate every token server-side,
- keep the secret server-only,
- use separate TEST and PROD widgets/keys,
- update privacy/processor documentation before production use,
- account for token expiry and single-use semantics in retry/idempotency UX,
- update CSP if required.

Do not add Turnstile only as security theatre.

## 5. PII-safe abuse telemetry

Allowed telemetry:

- WAF rule hit counts,
- allowed/limited request counts,
- HTTP status codes,
- application error codes,
- request/registration IDs where already permitted by the logging policy,
- latency and failure counts.

Do not add to abuse telemetry:

- participant or guardian names,
- birth dates,
- phone numbers,
- e-mail addresses,
- request bodies,
- operator notes.

IP-based WAF counting remains inside the hosting/security layer. The application must not start copying client IP addresses into `ZAPISY` or normal application logs merely for this feature.

## 6. Automated abuse-path coverage

CI must cover at least:

- honeypot payload rejected before persistence,
- impossibly fast form submission rejected before persistence,
- existing full Playwright suite remains green.

WAF behavior itself is verified at the platform layer because GitHub CI does not own or emulate the Vercel Firewall configuration.

## 7. Production gate

PR10 code/documentation can be merged before the WAF dashboard rule is published, but production opening remains blocked until the rule is configured and verified.

Required release evidence:

```text
[ ] Vercel WAF registration rate-limit rule exists
[ ] rule matches POST /api/registrations only
[ ] counting key and threshold reviewed
[ ] controlled closed-registration test produced 429 after threshold
[ ] ordinary form traffic still works
[ ] no participant PII was added to abuse telemetry
```
