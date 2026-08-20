import { Text } from "react-email";

import type { Registration } from "@/domain/registration";
import {
  Badge,
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
  const participantName = `${registration.participantFirstName} ${registration.participantLastName}`;
  const guardian =
    registration.guardianFirstName && registration.guardianLastName
      ? `${registration.guardianFirstName} ${registration.guardianLastName}`
      : null;

  return (
    <EmailLayout
      preview={`Nowe zgłoszenie: ${participantName} - ${registration.offeringNameSnapshot}`}
      maxWidth={680}
    >
      <BrandHeader />

      <Hero
        eyebrow="Nowe zgłoszenie"
        title={participantName}
        description={
          <>
            {registration.offeringNameSnapshot} · {registration.cityNameSnapshot}
          </>
        }
      />

      {registration.possibleDuplicateOf ? (
        <WarningNotice title="Możliwy duplikat wcześniejszego zgłoszenia">
          Porównaj dane z wcześniejszym rekordem przed dalszą obsługą. Informacja o możliwym
          duplikacie jest widoczna tylko administracyjnie.
        </WarningNotice>
      ) : null}

      <EmailCard>
        <SectionTitle>Uczestnik</SectionTitle>
        <DetailRow label="Imię i nazwisko" value={participantName} />
        {registration.birthDate ? (
          <DetailRow label="Data urodzenia" value={registration.birthDate} />
        ) : null}
        <DetailRow label="Wiek przy zapisie" value={`${registration.ageAtSubmission} lat`} last />
      </EmailCard>

      <EmailCard>
        <SectionTitle>Zajęcia</SectionTitle>
        <DetailRow label="Oferta" value={registration.offeringNameSnapshot} />
        <DetailRow label="Miasto" value={registration.cityNameSnapshot} />
        {registration.seasonNameSnapshot ? (
          <DetailRow label="Sezon" value={registration.seasonNameSnapshot} />
        ) : null}
        <DetailRow
          label="Status obsługi"
          value={<Badge tone="neutral">{registration.status}</Badge>}
          last
        />
      </EmailCard>

      <EmailCard>
        <SectionTitle>Kontakt</SectionTitle>
        {guardian ? <DetailRow label="Rodzic/opiekun" value={guardian} /> : null}
        <DetailRow label="Telefon" value={registration.phone} />
        <DetailRow label="E-mail" value={registration.email} last />
      </EmailCard>

      <EmailCard tone="muted">
        <SectionTitle>Obsługa zgłoszenia</SectionTitle>
        <StepRow
          number={1}
          title="Zweryfikuj dane"
          description="Sprawdź uczestnika, ofertę i ewentualny duplikat."
        />
        <StepRow
          number={2}
          title="Dobierz grupę"
          description="Przypisz właściwą grupę dopiero po potwierdzeniu realnych warunków zapisu."
        />
        <StepRow
          number={3}
          title="Skontaktuj się i zaktualizuj status"
          description="Po kontakcie zapisz aktualny status obsługi w arkuszu ZAPISY."
          last
        />
      </EmailCard>

      <EmailCard tone="default" padding="18px 20px">
        <SectionTitle>Dane systemowe</SectionTitle>
        <DetailRow label="Numer zgłoszenia" value={registration.id} />
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
          Odpowiedź na tę wiadomość trafi bezpośrednio na adres kontaktowy ze zgłoszenia.
        </Text>
      </EmailCard>

      <EmailFooter reference={registration.id} />
    </EmailLayout>
  );
}

export default RegistrationAdminEmail;
