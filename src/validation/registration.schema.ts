import { TECHNICAL_ID_PATTERN } from "@/domain/catalog";
import { calculateAgeToday, isValidIsoDateOnly } from "@/lib/birth-date";
import { containsWhitespace, normalizePersonName } from "@/lib/text-normalization";
import { z } from "zod";

const nonEmptyText = (label: string, maxLength = 100) =>
  z.string().trim().min(1, `${label} jest wymagane.`).max(maxLength, `${label} jest zbyt długie.`);

const personName = (label: string) =>
  z
    .string()
    .transform(normalizePersonName)
    .pipe(z.string().min(1, `${label} jest wymagane.`).max(100, `${label} jest zbyt długie.`));

const optionalPersonName = z
  .string()
  .transform(normalizePersonName)
  .pipe(z.string().max(100))
  .optional();

export const registrationRequestSchema = z
  .object({
    requestId: z.uuidv4({ error: "Nieprawidłowy identyfikator zgłoszenia." }),
    cityId: nonEmptyText("Miasto", 100).regex(
      TECHNICAL_ID_PATTERN,
      "Nieprawidłowy identyfikator miasta.",
    ),
    offeringId: nonEmptyText("Zajęcia", 100).regex(
      TECHNICAL_ID_PATTERN,
      "Nieprawidłowy identyfikator zajęć.",
    ),
    participantFirstName: personName("Imię"),
    participantLastName: personName("Nazwisko"),
    birthDate: nonEmptyText("Data urodzenia", 10).refine(isValidIsoDateOnly, {
      message: "Podaj poprawną datę urodzenia.",
    }),
    guardianFirstName: optionalPersonName,
    guardianLastName: optionalPersonName,
    phone: nonEmptyText("Numer telefonu", 40),
    email: z
      .string()
      .trim()
      .refine((value) => !containsWhitespace(value), {
        message: "Adres e-mail nie może zawierać spacji.",
      })
      .pipe(
        z
          .email({ error: "Podaj poprawny adres e-mail." })
          .max(254, { error: "Adres e-mail jest zbyt długi." }),
      ),
    renderedAt: z.int().positive(),
    website: z.string().max(0, "Nieprawidłowe zgłoszenie.").optional().default(""),
  })
  .superRefine((data, context) => {
    if (!isValidIsoDateOnly(data.birthDate)) {
      return;
    }

    const age = calculateAgeToday(data.birthDate);
    if (age < 0) {
      context.addIssue({
        code: "custom",
        path: ["birthDate"],
        message: "Data urodzenia nie może być w przyszłości.",
      });
      return;
    }

    if (age > 120) {
      context.addIssue({
        code: "custom",
        path: ["birthDate"],
        message: "Podaj poprawną datę urodzenia.",
      });
      return;
    }

    if (age < 18 && !data.guardianFirstName) {
      context.addIssue({
        code: "custom",
        path: ["guardianFirstName"],
        message: "Imię rodzica lub opiekuna jest wymagane.",
      });
    }

    if (age < 18 && !data.guardianLastName) {
      context.addIssue({
        code: "custom",
        path: ["guardianLastName"],
        message: "Nazwisko rodzica lub opiekuna jest wymagane.",
      });
    }
  });

export type RegistrationRequest = z.output<typeof registrationRequestSchema>;
export type RegistrationRequestInput = z.input<typeof registrationRequestSchema>;
