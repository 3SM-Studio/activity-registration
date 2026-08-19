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

type RegistrationConfirmationEmailProps = Readonly<{
  registration: Registration;
}>;

const colors = {
  background: "#fff8ed",
  surface: "#fffcf7",
  foreground: "#29172d",
  muted: "#74616f",
  line: "#e8d7c6",
  brand: "#a3205a",
} as const;

const labelStyle = {
  color: colors.muted,
  fontSize: "14px",
  lineHeight: "20px",
  padding: "6px 12px 6px 0",
  width: "150px",
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

export function RegistrationConfirmationEmail({
  registration,
}: RegistrationConfirmationEmailProps) {
  const participantName = `${registration.participantFirstName} ${registration.participantLastName}`;

  return (
    <Html lang="pl" dir="ltr">
      <Head />
      <Preview>Pozytywka otrzymała Twoje zgłoszenie na zajęcia.</Preview>
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
            maxWidth: "640px",
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
              margin: "0 0 18px",
            }}
          >
            Dziękujemy za zgłoszenie
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "26px", margin: "0 0 22px" }}>
            Otrzymaliśmy Twoje zgłoszenie do Pracowni Twórczej Pozytywka.
          </Text>

          <Section
            style={{
              borderTop: `1px solid ${colors.line}`,
              borderBottom: `1px solid ${colors.line}`,
              padding: "14px 0",
            }}
          >
            <DetailRow label="Uczestnik" value={participantName} />
            <DetailRow label="Zajęcia" value={registration.offeringNameSnapshot} />
            <DetailRow label="Miasto" value={registration.cityNameSnapshot} />
            <DetailRow label="Numer zgłoszenia" value={registration.id} />
          </Section>

          <Text style={{ fontSize: "15px", lineHeight: "24px", margin: "22px 0 0" }}>
            Zgłoszenie zostało zapisane. Jeśli będziemy potrzebowali dodatkowych informacji,
            skontaktujemy się z Tobą.
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: "13px",
              lineHeight: "20px",
              margin: "16px 0 0",
            }}
          >
            To jest potwierdzenie otrzymania zgłoszenia, a nie potwierdzenie miejsca na zajęciach.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RegistrationConfirmationEmail;
