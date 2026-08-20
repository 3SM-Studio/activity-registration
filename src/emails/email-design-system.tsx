import type { CSSProperties, ReactNode } from "react";
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

export const emailColors = {
  background: "#fff8ed",
  surface: "#fffcf7",
  surfaceStrong: "#ffffff",
  surfaceMuted: "#fff8f2",
  foreground: "#29172d",
  muted: "#74616f",
  line: "#e8d7c6",
  brand: "#a3205a",
  brandSoft: "#f9e8ef",
  teal: "#147a76",
  tealSoft: "#e3f3ef",
  gold: "#f6c85f",
  warning: "#9a3412",
  warningSoft: "#fff7ed",
  warningLine: "#fed7aa",
} as const;

const fontFamily =
  'Inter, "Avenir Next", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';

const cardBaseStyle: CSSProperties = {
  backgroundColor: emailColors.surfaceStrong,
  border: `1px solid ${emailColors.line}`,
  borderRadius: "18px",
  padding: "24px",
};

type EmailLayoutProps = Readonly<{
  preview: string;
  children: ReactNode;
  maxWidth?: number;
}>;

export function EmailLayout({ preview, children, maxWidth = 640 }: EmailLayoutProps) {
  return (
    <Html lang="pl" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailColors.background,
          color: emailColors.foreground,
          fontFamily,
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container style={{ margin: "0 auto", maxWidth: `${maxWidth}px`, width: "100%" }}>
          {children}
        </Container>
      </Body>
    </Html>
  );
}

export function BrandHeader() {
  return (
    <Section style={{ padding: "0 8px 20px" }}>
      <Row>
        <Column style={{ verticalAlign: "middle", width: "48px" }}>
          <Text
            style={{
              backgroundColor: emailColors.brand,
              borderRadius: "12px",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 800,
              height: "40px",
              lineHeight: "40px",
              margin: 0,
              textAlign: "center",
              width: "40px",
            }}
          >
            P
          </Text>
        </Column>
        <Column style={{ verticalAlign: "middle" }}>
          <Text
            style={{
              color: emailColors.foreground,
              fontSize: "16px",
              fontWeight: 800,
              lineHeight: "20px",
              margin: 0,
            }}
          >
            Pozytywka
          </Text>
          <Text
            style={{
              color: emailColors.muted,
              fontSize: "12px",
              lineHeight: "17px",
              margin: "2px 0 0",
            }}
          >
            Pracownia Twórcza
          </Text>
        </Column>
      </Row>
    </Section>
  );
}

type EmailCardProps = Readonly<{
  children: ReactNode;
  tone?: "default" | "muted" | "brand" | "success" | "warning";
  padding?: string;
}>;

export function EmailCard({ children, tone = "default", padding = "24px" }: EmailCardProps) {
  const toneStyle: Record<NonNullable<EmailCardProps["tone"]>, CSSProperties> = {
    default: {
      backgroundColor: emailColors.surfaceStrong,
      borderColor: emailColors.line,
    },
    muted: {
      backgroundColor: emailColors.surfaceMuted,
      borderColor: emailColors.line,
    },
    brand: {
      backgroundColor: emailColors.brandSoft,
      borderColor: "#efc8d8",
    },
    success: {
      backgroundColor: emailColors.tealSoft,
      borderColor: "#b9ded8",
    },
    warning: {
      backgroundColor: emailColors.warningSoft,
      borderColor: emailColors.warningLine,
    },
  };

  return (
    <Section style={{ ...cardBaseStyle, ...toneStyle[tone], padding, marginBottom: "14px" }}>
      {children}
    </Section>
  );
}

type BadgeProps = Readonly<{
  children: ReactNode;
  tone?: "brand" | "success" | "warning" | "neutral";
}>;

export function Badge({ children, tone = "brand" }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps["tone"]>, CSSProperties> = {
    brand: { backgroundColor: emailColors.brandSoft, color: emailColors.brand },
    success: { backgroundColor: emailColors.tealSoft, color: emailColors.teal },
    warning: { backgroundColor: emailColors.warningSoft, color: emailColors.warning },
    neutral: { backgroundColor: emailColors.surfaceMuted, color: emailColors.muted },
  };

  return (
    <Text
      style={{
        ...styles[tone],
        borderRadius: "999px",
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.8px",
        lineHeight: "16px",
        margin: 0,
        padding: "6px 10px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

type HeroProps = Readonly<{
  eyebrow: string;
  title: string;
  description: ReactNode;
  tone?: "brand" | "success";
}>;

export function Hero({ eyebrow, title, description, tone = "brand" }: HeroProps) {
  return (
    <EmailCard tone={tone === "success" ? "success" : "brand"} padding="30px 28px">
      <Badge tone={tone}>{eyebrow}</Badge>
      <Heading
        as="h1"
        style={{
          color: emailColors.foreground,
          fontSize: "30px",
          fontWeight: 800,
          letterSpacing: "-0.7px",
          lineHeight: "36px",
          margin: "18px 0 12px",
        }}
      >
        {title}
      </Heading>
      <Text
        style={{
          color: emailColors.foreground,
          fontSize: "16px",
          lineHeight: "25px",
          margin: 0,
        }}
      >
        {description}
      </Text>
    </EmailCard>
  );
}

export function SectionTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Heading
      as="h2"
      style={{
        color: emailColors.foreground,
        fontSize: "17px",
        fontWeight: 800,
        lineHeight: "23px",
        margin: "0 0 14px",
      }}
    >
      {children}
    </Heading>
  );
}

type DetailRowProps = Readonly<{
  label: string;
  value: ReactNode;
  last?: boolean;
}>;

export function DetailRow({ label, value, last = false }: DetailRowProps) {
  return (
    <Row>
      <Column
        style={{
          borderBottom: last ? "0" : `1px solid ${emailColors.line}`,
          padding: "10px 12px 10px 0",
          verticalAlign: "top",
          width: "42%",
        }}
      >
        <Text
          style={{
            color: emailColors.muted,
            fontSize: "13px",
            lineHeight: "19px",
            margin: 0,
          }}
        >
          {label}
        </Text>
      </Column>
      <Column
        style={{
          borderBottom: last ? "0" : `1px solid ${emailColors.line}`,
          padding: "10px 0",
          verticalAlign: "top",
        }}
      >
        <Text
          style={{
            color: emailColors.foreground,
            fontSize: "14px",
            fontWeight: 650,
            lineHeight: "20px",
            margin: 0,
          }}
        >
          {value}
        </Text>
      </Column>
    </Row>
  );
}

type StepRowProps = Readonly<{
  number: number;
  title: string;
  description: string;
  last?: boolean;
}>;

export function StepRow({ number, title, description, last = false }: StepRowProps) {
  return (
    <Row>
      <Column
        style={{
          padding: last ? "8px 12px 0 0" : "8px 12px 16px 0",
          verticalAlign: "top",
          width: "40px",
        }}
      >
        <Text
          style={{
            backgroundColor: emailColors.brand,
            borderRadius: "999px",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 800,
            height: "28px",
            lineHeight: "28px",
            margin: 0,
            textAlign: "center",
            width: "28px",
          }}
        >
          {number}
        </Text>
      </Column>
      <Column style={{ padding: last ? "8px 0 0" : "8px 0 16px", verticalAlign: "top" }}>
        <Text
          style={{
            color: emailColors.foreground,
            fontSize: "14px",
            fontWeight: 800,
            lineHeight: "20px",
            margin: 0,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: emailColors.muted,
            fontSize: "13px",
            lineHeight: "20px",
            margin: "3px 0 0",
          }}
        >
          {description}
        </Text>
      </Column>
    </Row>
  );
}

export function WarningNotice({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <EmailCard tone="warning" padding="18px 20px">
      <Text
        style={{
          color: emailColors.warning,
          fontSize: "13px",
          fontWeight: 800,
          lineHeight: "19px",
          margin: 0,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: emailColors.warning,
          fontSize: "13px",
          lineHeight: "20px",
          margin: "5px 0 0",
        }}
      >
        {children}
      </Text>
    </EmailCard>
  );
}

export function EmailFooter({ reference }: Readonly<{ reference?: string }>) {
  return (
    <Section style={{ padding: "18px 16px 4px", textAlign: "center" }}>
      <Text
        style={{
          color: emailColors.foreground,
          fontSize: "13px",
          fontWeight: 800,
          lineHeight: "18px",
          margin: 0,
        }}
      >
        Pracownia Twórcza Pozytywka
      </Text>
      <Text
        style={{
          color: emailColors.muted,
          fontSize: "11px",
          lineHeight: "17px",
          margin: "5px auto 0",
          maxWidth: "430px",
        }}
      >
        Wiadomość systemowa dotycząca zgłoszenia na zajęcia.
        {reference ? ` Numer zgłoszenia: ${reference}.` : ""}
      </Text>
    </Section>
  );
}
