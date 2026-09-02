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
  emailColors,
} from "@/emails/email-design-system";

type RegistrationConfirmationEmailProps = Readonly<{
  registration: Registration;
}>;

export function RegistrationConfirmationEmail({
  registration,
}: RegistrationConfirmationEmailProps) {
  const participantName = `${registration.participantFirstName} ${registration.participantLastName}`;

  return (
    <EmailLayout preview="Pozytywka otrzymała Twoje zgłoszenie na zajęcia.">
      <BrandHeader />

      <Hero
        eyebrow="Zgłoszenie otrzymane"
        title="Dziękujemy, mamy zgłoszenie"
        tone="success"
        description={
          <>
            Zgłoszenie dotyczące <strong>{participantName}</strong> dotarło do Pozytywki. Teraz
            sprawdzimy je i wrócimy z potwierdzeniem dostępności oraz dalszymi krokami.
          </>
        }
      />

      <EmailCard>
        <SectionTitle>Twoje zgłoszenie</SectionTitle>
        <DetailRow label="Uczestnik" value={participantName} />
        <DetailRow label="Zajęcia" value={registration.offeringNameSnapshot} />
        <DetailRow
          label="Miasto"
          value={registration.cityNameSnapshot}
          last={!registration.seasonNameSnapshot}
        />
        {registration.seasonNameSnapshot ? (
          <DetailRow label="Sezon" value={registration.seasonNameSnapshot} last />
        ) : null}
      </EmailCard>

      <EmailCard tone="muted">
        <SectionTitle>Co dzieje się teraz?</SectionTitle>
        <StepRow
          number={1}
          title="Sprawdzamy zgłoszenie"
          description="Weryfikujemy przesłane dane i dostępne możliwości zapisów."
        />
        <StepRow
          number={2}
          title="Sprawdzamy dostępność"
          description="Weryfikujemy wybraną ofertę, wiek uczestnika i możliwość przyjęcia zgłoszenia."
        />
        <StepRow
          number={3}
          title="Przekazujemy dalsze kroki"
          description="Po weryfikacji Pozytywka potwierdzi możliwość udziału albo skontaktuje się w sprawie dalszych kroków."
          last
        />
      </EmailCard>

      <EmailCard tone="brand" padding="18px 20px">
        <Text
          style={{
            color: emailColors.foreground,
            fontSize: "13px",
            fontWeight: 800,
            lineHeight: "20px",
            margin: 0,
          }}
        >
          Ważne
        </Text>
        <Text
          style={{
            color: emailColors.foreground,
            fontSize: "13px",
            lineHeight: "20px",
            margin: "4px 0 0",
          }}
        >
          To potwierdzenie otrzymania zgłoszenia, nie potwierdzenie miejsca na zajęciach. Na tym
          etapie nie musisz wysyłać formularza ponownie.
        </Text>
      </EmailCard>

      <EmailFooter />
    </EmailLayout>
  );
}

export default RegistrationConfirmationEmail;
