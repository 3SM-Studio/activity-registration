import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

import type { Registration } from "@/domain/registration";

type RegistrationAdminEmailProps = Readonly<{
  registration: Registration;
}>;

const colors = {
  background: "#f7f7f8",
  surface: "#ffffff",
  foreground: "#29172d",
  muted: "#74616f",
  line: "#e8d7c6",
  brand: "#a3205a",
  warningBackground: "#fff7ed",
  warningForeground: "#9a3412",
  warningLine: "#fed7aa",
} as const;

const labelStyle = {
  color: colors.muted,
  fontSize: "14px",
  lineHeight: "20px",
  padding: "6px 12px 6px 0",
  width: "160px",
} as const;

const valueStyle = {
  color: colors.foreground,
  fontSize: "14px",
  lineHeight: "20px",
  padding: "6px 0",
} as const;

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Row>
      <Column style={labelStyle}>{label}</Column>
      <Column style={valueStyle}>{value}</Column>
    </Row>
  );
}

export function RegistrationAdminEmail({ registration }: RegistrationAdminEmailProps) {
  const participantName = `${registration.participantFirstName} ${registration.participantLastName}`;
  const guardian =
    registration.guardianFirstName && registration.guardianLastName
      ? `${registration.guardianFirstName} ${registration.guardianLastName}`
      : null;

  return (
    <Html lang="pl" dir="ltr">
      <Head />
      <Preview>
        Nowe zgłoszenie: {participantName} - {registration.offeringNameSnapshot}
      </Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          color: colors.foreground,
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: 0,
          padding: "32px 16px",
        }}
      >
        <Container
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.line}`,
            borderRadius: "20px",
            margin: "0 auto",
            maxWidth: "680px",
            padding: "32px",
          }}
        >
          <Text
            style={{
              color: colors.brand,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1.6px",
              margin: "0 0 10px",
              textTransform: "uppercase",
            }}
          >
            Pracownia Twórcza Pozytywka
          </Text>
          <Heading
            as="h1"
            style={{
              color: colors.foreground,
              fontSize: "26px",
              lineHeight: "32px",
              margin: "0 0 22px",
            }}
          >
            Nowe zgłoszenie do weryfikacji
          </Heading>

          {registration.possibleDuplicateOf ? (
            <Section
              style={{
                backgroundColor: colors.warningBackground,
                border: `1px solid ${colors.warningLine}`,
                borderRadius: "12px",
                margin: "0 0 20px",
                padding: "12px 16px",
              }}
            >
              <Text
                style={{
                  color: colors.warningForeground,
                  fontSize: "14px",
                  fontWeight: 700,
                  lineHeight: "20px",
                  margin: 0,
                }}
              >
                UWAGA: możliwy duplikat wcześniejszego zgłoszenia
              </Text>
              <Text
                style={{
                  color: colors.warningForeground,
                  fontSize: "13px",
                  lineHeight: "20px",
                  margin: "6px 0 0",
                }}
              >
                Porównaj dane z wcześniejszym rekordem przed dalszą obsługą.
              </Text>
            </Section>
          ) : null}

          <Section
            style={{
              borderTop: `1px solid ${colors.line}`,
              borderBottom: `1px solid ${colors.line}`,
              padding: "14px 0",
            }}
          >
            <DetailRow label="Uczestnik" value={participantName} />
            {registration.birthDate ? (
              <DetailRow label="Data urodzenia" value={registration.birthDate} />
            ) : null}
            <DetailRow label="Wiek przy zapisie" value={String(registration.ageAtSubmission)} />
            <DetailRow label="Zajęcia" value={registration.offeringNameSnapshot} />
            <DetailRow label="Miasto" value={registration.cityNameSnapshot} />
            {guardian ? <DetailRow label="Rodzic/opiekun" value={guardian} /> : null}
            <DetailRow label="Telefon" value={registration.phone} />
            <DetailRow label="E-mail" value={registration.email} />
            <DetailRow label="Numer zgłoszenia" value={registration.id} />
            <DetailRow label="Wysłano" value={registration.submittedAt} />
          </Section>

          <Heading
            as="h2"
            style={{
              color: colors.foreground,
              fontSize: "18px",
              lineHeight: "24px",
              margin: "22px 0 8px",
            }}
          >
            Następny krok
          </Heading>
          <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0 }}>
            Zweryfikuj zgłoszenie, dobierz odpowiednią grupę i skontaktuj się z uczestnikiem lub
            rodzicem/opiekunem. Status obsługi aktualizuj w arkuszu ZAPISY.
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: "13px",
              lineHeight: "20px",
              margin: "18px 0 0",
            }}
          >
            Odpowiedź na tę wiadomość trafi bezpośrednio na adres kontaktowy ze zgłoszenia.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RegistrationAdminEmail;
