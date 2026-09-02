import { Text } from "react-email";

import type { Registration } from "@/domain/registration";
import {
  BrandHeader,
  DetailRow,
  EmailCard,
  EmailFooter,
  EmailLayout,
  Hero,
  SectionTitle,
  StepRow,
  WarningNotice,
  emailColors,
} from "@/emails/email-design-system";

type RegistrationAdminEmailProps = Readonly<{
  registration: Registration;
}>;

export function RegistrationAdminEmail({ registration }: RegistrationAdminEmailProps) {
  const participantKind = registration.guardianFirstName ? "osoba małoletnia" : "osoba pełnoletnia";

  return (
    <EmailLayout
      preview={`Nowe zgłoszenie do obsługi - ${registration.offeringNameSnapshot}`}
      maxWidth={680}
    >
      <BrandHeader />

      <Hero
        eyebrow="Nowe zgłoszenie"
        title="Nowe zgłoszenie do obsługi"
        description={
          <>
            {registration.offeringNameSnapshot} · {registration.cityNameSnapshot}
          </>
        }
      />

      {registration.possibleDuplicateOf ? (
        <WarningNotice title="Możliwy duplikat wcześniejszego zgłoszenia">
          Otwórz chroniony arkusz ZAPISY i porównaj rekordy przed dalszą obsługą.
        </WarningNotice>
      ) : null}

      <EmailCard>
        <SectionTitle>Informacje operacyjne</SectionTitle>
        <DetailRow label="Oferta" value={registration.offeringNameSnapshot} />
        <DetailRow label="Miasto" value={registration.cityNameSnapshot} />
        {registration.seasonNameSnapshot ? (
          <DetailRow label="Sezon" value={registration.seasonNameSnapshot} />
        ) : null}
        <DetailRow label="Uczestnik" value={participantKind} />
        <DetailRow label="Wiek przy zapisie" value={`${registration.ageAtSubmission} lat`} />
        <DetailRow label="Status" value={registration.status} last />
      </EmailCard>

      <EmailCard tone="muted">
        <SectionTitle>Co zrobić</SectionTitle>
        <StepRow
          number={1}
          title="Otwórz chroniony arkusz ZAPISY"
          description="Pełne dane kontaktowe i dane uczestnika pozostają wyłącznie w kontrolowanym rejestrze operacyjnym."
        />
        <StepRow
          number={2}
          title="Zweryfikuj zgłoszenie i dobierz grupę"
          description="Sprawdź wiek, ofertę, dostępność miejsc i ewentualny duplikat."
        />
        <StepRow
          number={3}
          title="Skontaktuj się i zaktualizuj workflow"
          description="Po obsłudze ustaw status, grupę i wymagane daty w arkuszu."
          last
        />
      </EmailCard>

      <EmailCard tone="default" padding="18px 20px">
        <SectionTitle>Dane systemowe</SectionTitle>
        <DetailRow label="Wysłano" value={registration.submittedAt} last />
        <Text
          style={{
            borderTop: `1px solid ${emailColors.line}`,
            color: emailColors.muted,
            fontSize: "12px",
            lineHeight: "18px",
            margin: "14px 0 0",
            paddingTop: "14px",
          }}
        >
          Ta wiadomość celowo nie zawiera pełnych danych uczestnika ani danych kontaktowych.
        </Text>
      </EmailCard>

      <EmailFooter />
    </EmailLayout>
  );
}

export default RegistrationAdminEmail;
