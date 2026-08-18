import { TECHNICAL_ID_PATTERN } from "@/domain/catalog";
import { z } from "zod";

const nonEmptyText = (label: string, maxLength = 100) =>
  z.string().trim().min(1, `${label} jest wymagane.`).max(maxLength, `${label} jest zbyt długie.`);

const optionalPersonName = z.string().trim().max(100).optional();

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
    participantFirstName: nonEmptyText("Imię", 100),
    participantLastName: nonEmptyText("Nazwisko", 100),
    age: z
      .int({ error: "Wiek musi być liczbą całkowitą." })
      .min(0, { error: "Wiek nie może być ujemny." })
      .max(120, { error: "Podaj poprawny wiek." }),
    guardianFirstName: optionalPersonName,
    guardianLastName: optionalPersonName,
    phone: nonEmptyText("Numer telefonu", 40),
    email: z
      .string()
      .trim()
      .pipe(
        z
          .email({ error: "Podaj poprawny adres e-mail." })
          .max(254, { error: "Adres e-mail jest zbyt długi." }),
      ),
    renderedAt: z.int().positive(),
    website: z.string().max(0, "Nieprawidłowe zgłoszenie.").optional().default(""),
  })
  .superRefine((data, context) => {
    if (data.age < 18 && !data.guardianFirstName) {
      context.addIssue({
        code: "custom",
        path: ["guardianFirstName"],
        message: "Imię rodzica lub opiekuna jest wymagane.",
      });
    }

    if (data.age < 18 && !data.guardianLastName) {
      context.addIssue({
        code: "custom",
        path: ["guardianLastName"],
        message: "Nazwisko rodzica lub opiekuna jest wymagane.",
      });
    }
  });

export type RegistrationRequest = z.output<typeof registrationRequestSchema>;
export type RegistrationRequestInput = z.input<typeof registrationRequestSchema>;
