"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { APPLICATION_ERROR_CODE } from "@/application/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BirthDatePicker } from "@/components/ui/birth-date-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PUBLIC_INTAKE_STATUS, type PublicCatalog, type PublicOffering } from "@/domain/catalog";
import type { PublicSettings } from "@/domain/settings";
import { calculateAgeToday } from "@/lib/birth-date";
import {
  registrationRequestSchema,
  type RegistrationRequest,
  type RegistrationRequestInput,
} from "@/validation/registration.schema";

type RegistrationFormProps = Readonly<{
  catalog: PublicCatalog;
  settings: PublicSettings;
}>;

type ApiErrorResponse = Readonly<{
  ok: false;
  code: string;
  message: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

type ApiSuccessResponse = Readonly<{
  ok: true;
  registrationId: string;
  duplicate: boolean;
}>;

type SuccessState = Readonly<{
  kind: "created" | "duplicate";
  participantName: string;
  participantIsMinor: boolean;
  offeringName: string;
  cityName: string;
}> | null;

function newRequestId(): string {
  return crypto.randomUUID();
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function offeringLabel(offering: PublicOffering): string {
  switch (offering.intakeStatus) {
    case PUBLIC_INTAKE_STATUS.waitlistOnly:
      return `${offering.name} - obecnie lista rezerwowa`;
    case PUBLIC_INTAKE_STATUS.upcoming:
      return `${offering.name} - zapisy wkrótce`;
    case PUBLIC_INTAKE_STATUS.closed:
      return `${offering.name} - zapisy zamknięte`;
    default:
      return offering.name;
  }
}

function offeringIsSelectable(offering: PublicOffering): boolean {
  return (
    offering.intakeStatus === PUBLIC_INTAKE_STATUS.open ||
    offering.intakeStatus === PUBLIC_INTAKE_STATUS.waitlistOnly
  );
}

export function RegistrationForm({ catalog, settings }: RegistrationFormProps) {
  const router = useRouter();
  const [renderedAt] = useState(() => Date.now());
  const [initialRequestId] = useState(newRequestId);
  const [successState, setSuccessState] = useState<SuccessState>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const validationSummaryRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationRequestInput, unknown, RegistrationRequest>({
    resolver: zodResolver(registrationRequestSchema),
    shouldFocusError: false,
    defaultValues: {
      requestId: initialRequestId,
      cityId: "",
      offeringId: "",
      participantFirstName: "",
      participantLastName: "",
      birthDate: "",
      guardianFirstName: "",
      guardianLastName: "",
      phone: "",
      email: "",
      renderedAt,
      website: "",
    },
  });

  const cityId = useWatch({ control, name: "cityId" });
  const offeringId = useWatch({ control, name: "offeringId" });
  const birthDate = useWatch({ control, name: "birthDate" });
  const age = birthDate ? calculateAgeToday(birthDate) : null;
  const hasKnownAge = typeof age === "number" && age >= 0;
  const isMinor = hasKnownAge && age < 18;

  const availableOfferings = useMemo(
    () => catalog.offerings.filter((offering) => offering.cityId === cityId),
    [catalog.offerings, cityId],
  );
  const selectedOffering = useMemo(
    () => availableOfferings.find((offering) => offering.id === offeringId) ?? null,
    [availableOfferings, offeringId],
  );

  useEffect(() => {
    if (!showValidationSummary) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      validationSummaryRef.current?.focus({ preventScroll: true });
      validationSummaryRef.current?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "center",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [showValidationSummary]);

  const invalid = () => {
    setGlobalError(null);
    setShowValidationSummary(true);
  };

  const submit = async (data: RegistrationRequest) => {
    setGlobalError(null);
    setShowValidationSummary(false);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const payload = (await response.json()) as ApiSuccessResponse | ApiErrorResponse;

      if (!response.ok || !payload.ok) {
        const failure = payload as ApiErrorResponse;
        for (const [field, messages] of Object.entries(failure.fieldErrors ?? {})) {
          const firstMessage = messages?.[0];
          if (firstMessage) {
            setError(field as keyof RegistrationRequestInput, {
              type: "server",
              message: firstMessage,
            });
          }
        }

        if (failure.code === APPLICATION_ERROR_CODE.cityNotAvailable) {
          setValue("cityId", "", { shouldDirty: true });
          setValue("offeringId", "", { shouldDirty: true });
          setError("cityId", { type: "server", message: failure.message });
          router.refresh();
        } else if (
          failure.code === APPLICATION_ERROR_CODE.offeringNotAvailable ||
          failure.code === APPLICATION_ERROR_CODE.offeringCityMismatch
        ) {
          setValue("offeringId", "", { shouldDirty: true });
          setError("offeringId", { type: "server", message: failure.message });
          router.refresh();
        } else if (
          failure.code === APPLICATION_ERROR_CODE.registrationsClosed ||
          failure.code === APPLICATION_ERROR_CODE.systemNotReady
        ) {
          router.refresh();
        } else if (failure.code === APPLICATION_ERROR_CODE.requestIdConflict) {
          setValue("requestId", newRequestId());
        }

        setGlobalError(failure.message || "Nie udało się wysłać zgłoszenia.");
        return;
      }

      const cityName = catalog.cities.find((city) => city.id === data.cityId)?.name ?? data.cityId;
      const offeringName =
        catalog.offerings.find((offering) => offering.id === data.offeringId)?.name ??
        data.offeringId;

      setSuccessState({
        kind: payload.duplicate ? "duplicate" : "created",
        participantName: `${data.participantFirstName} ${data.participantLastName}`,
        participantIsMinor: calculateAgeToday(data.birthDate) < 18,
        offeringName,
        cityName,
      });
    } catch {
      setGlobalError(
        "Nie udało się połączyć z systemem zapisów. Twoje dane pozostały w formularzu. Spróbuj ponownie.",
      );
    }
  };

  const beginAnotherChild = () => {
    const current = getValues();
    reset({
      requestId: newRequestId(),
      cityId: current.cityId,
      offeringId: "",
      participantFirstName: "",
      participantLastName: "",
      birthDate: "",
      guardianFirstName: current.guardianFirstName ?? "",
      guardianLastName: current.guardianLastName ?? "",
      phone: current.phone,
      email: current.email,
      renderedAt: Date.now(),
      website: "",
    });
    setSuccessState(null);
    setGlobalError(null);
    setShowValidationSummary(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: preferredScrollBehavior() }));
  };

  const beginAnotherOffering = () => {
    const current = getValues();
    reset({
      requestId: newRequestId(),
      cityId: current.cityId,
      offeringId: "",
      participantFirstName: current.participantFirstName,
      participantLastName: current.participantLastName,
      birthDate: current.birthDate,
      guardianFirstName: current.guardianFirstName ?? "",
      guardianLastName: current.guardianLastName ?? "",
      phone: current.phone,
      email: current.email,
      renderedAt: Date.now(),
      website: "",
    });
    setSuccessState(null);
    setGlobalError(null);
    setShowValidationSummary(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: preferredScrollBehavior() }));
  };

  if (!settings.registrationsOpen) {
    return (
      <Card className="text-center" aria-live="polite">
        <h2 className="text-xl font-semibold text-foreground">Zapisy są zamknięte</h2>
        <p className="mt-2 text-muted-foreground">Formularz nie przyjmuje teraz nowych zgłoszeń.</p>
      </Card>
    );
  }

  if (catalog.cities.length === 0 || catalog.offerings.length === 0) {
    return (
      <Card className="text-center" aria-live="polite">
        <h2 className="text-xl font-semibold text-foreground">Brak dostępnych zajęć</h2>
        <p className="mt-2 text-muted-foreground">Aktualnie nie ma zajęć dostępnych do zapisów.</p>
      </Card>
    );
  }

  if (successState) {
    const isDuplicate = successState.kind === "duplicate";

    return (
      <Card className="text-center" aria-live="polite">
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800"
          aria-hidden="true"
        >
          ✓
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {isDuplicate ? "Takie zgłoszenie jest już w systemie" : "Dziękujemy, mamy zgłoszenie"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {isDuplicate
            ? "Nie musisz wysyłać go ponownie. Pozytywka skontaktuje się z Tobą po jego weryfikacji."
            : `Otrzymaliśmy zgłoszenie ${successState.participantName} na ${successState.offeringName} w ${successState.cityName}.`}
        </p>

        {!isDuplicate ? (
          <>
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-border bg-muted/45 p-4 text-left sm:p-5">
              <h3 className="font-semibold text-foreground">Co dalej?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Pozytywka sprawdzi poprawność zgłoszenia i dostępność miejsca. Po weryfikacji
                skontaktujemy się z Tobą, żeby potwierdzić udział lub przekazać dalsze kroki. Samo
                wysłanie formularza nie oznacza jeszcze potwierdzenia miejsca.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Potwierdzenie e-mail powinno dotrzeć na podany adres. Jeśli go nie widzisz, sprawdź
                folder spam. Nie wysyłaj formularza ponownie tylko z tego powodu.
              </p>
            </div>

            <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" size="lg" onClick={beginAnotherChild}>
                {successState.participantIsMinor ? "Zapisz kolejne dziecko" : "Zgłoś kolejną osobę"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={beginAnotherOffering}>
                Zgłoś inne zajęcia
              </Button>
            </div>
          </>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <form
        ref={(node) => {
          if (node) {
            node.dataset.hydrated = "true";
          }
        }}
        noValidate
        onSubmit={handleSubmit(submit, invalid)}
        className="space-y-8"
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Pola oznaczone <span aria-hidden="true">*</span> są wymagane.
        </p>

        <FieldSet>
          <FieldLegend>Zajęcia</FieldLegend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="cityId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="cityId">
                    Miasto <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value ?? ""}
                    required
                    onValueChange={(nextCityId) => {
                      field.onChange(nextCityId);
                      setValue("offeringId", "", {
                        shouldDirty: true,
                        shouldValidate: false,
                      });
                      clearErrors("offeringId");
                    }}
                  >
                    <SelectTrigger
                      id="cityId"
                      aria-required="true"
                      aria-invalid={fieldState.invalid}
                      {...(fieldState.invalid ? { "aria-describedby": "cityId-error" } : {})}
                    >
                      <SelectValue placeholder="Wybierz miasto" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError id="cityId-error" errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="offeringId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="offeringId">
                    Zajęcia <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={!cityId}
                    required
                  >
                    <SelectTrigger
                      id="offeringId"
                      aria-required="true"
                      aria-invalid={fieldState.invalid}
                      {...(fieldState.invalid ? { "aria-describedby": "offeringId-error" } : {})}
                    >
                      <SelectValue
                        placeholder={cityId ? "Wybierz zajęcia" : "Najpierw wybierz miasto"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOfferings.map((offering) => (
                        <SelectItem
                          key={offering.id}
                          value={offering.id}
                          disabled={!offeringIsSelectable(offering)}
                        >
                          {offeringLabel(offering)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOffering?.intakeStatus === PUBLIC_INTAKE_STATUS.waitlistOnly ? (
                    <FieldDescription>
                      Na te zajęcia przyjmujemy teraz zgłoszenia na listę rezerwową.
                    </FieldDescription>
                  ) : selectedOffering?.publicDescription ? (
                    <FieldDescription>{selectedOffering.publicDescription}</FieldDescription>
                  ) : null}
                  <FieldError id="offeringId-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Dane uczestnika</FieldLegend>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.participantFirstName)}>
              <FieldLabel htmlFor="participantFirstName">
                Imię <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                id="participantFirstName"
                required
                autoComplete="given-name"
                maxLength={100}
                aria-invalid={Boolean(errors.participantFirstName)}
                aria-describedby={
                  errors.participantFirstName ? "participantFirstName-error" : undefined
                }
                {...register("participantFirstName")}
              />
              <FieldError id="participantFirstName-error" errors={[errors.participantFirstName]} />
            </Field>

            <Field data-invalid={Boolean(errors.participantLastName)}>
              <FieldLabel htmlFor="participantLastName">
                Nazwisko <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                id="participantLastName"
                required
                autoComplete="family-name"
                maxLength={100}
                aria-invalid={Boolean(errors.participantLastName)}
                aria-describedby={
                  errors.participantLastName ? "participantLastName-error" : undefined
                }
                {...register("participantLastName")}
              />
              <FieldError id="participantLastName-error" errors={[errors.participantLastName]} />
            </Field>
          </div>

          <Controller
            name="birthDate"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="max-w-sm" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="birthDate">
                  Data urodzenia <span aria-hidden="true">*</span>
                </FieldLabel>
                <BirthDatePicker
                  id="birthDate"
                  value={field.value ?? ""}
                  required
                  onChange={(nextBirthDate) => {
                    field.onChange(nextBirthDate);
                    if (calculateAgeToday(nextBirthDate) >= 18) {
                      setValue("guardianFirstName", "", { shouldDirty: true });
                      setValue("guardianLastName", "", { shouldDirty: true });
                      clearErrors(["guardianFirstName", "guardianLastName"]);
                    }
                  }}
                  onBlur={field.onBlur}
                  invalid={fieldState.invalid}
                  describedBy={fieldState.invalid ? "birthDate-error" : "birthDate-description"}
                />
                <FieldDescription id="birthDate-description">
                  Data urodzenia pomaga nam dobrać odpowiednią grupę wiekową oraz ustalić, czy
                  potrzebujemy danych rodzica lub opiekuna.
                </FieldDescription>
                <FieldError id="birthDate-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldSet>

        {isMinor ? (
          <FieldSet className="rounded-2xl border border-border bg-muted/45 p-4 sm:p-5">
            <FieldLegend className="px-1">Rodzic lub opiekun</FieldLegend>
            <FieldDescription>
              Uczestnik jest niepełnoletni, dlatego potrzebujemy danych osoby odpowiedzialnej za
              zgłoszenie.
            </FieldDescription>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.guardianFirstName)}>
                <FieldLabel htmlFor="guardianFirstName">
                  Imię rodzica lub opiekuna <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  id="guardianFirstName"
                  required
                  autoComplete="given-name"
                  maxLength={100}
                  aria-invalid={Boolean(errors.guardianFirstName)}
                  aria-describedby={
                    errors.guardianFirstName ? "guardianFirstName-error" : undefined
                  }
                  {...register("guardianFirstName")}
                />
                <FieldError id="guardianFirstName-error" errors={[errors.guardianFirstName]} />
              </Field>

              <Field data-invalid={Boolean(errors.guardianLastName)}>
                <FieldLabel htmlFor="guardianLastName">
                  Nazwisko rodzica lub opiekuna <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  id="guardianLastName"
                  required
                  autoComplete="family-name"
                  maxLength={100}
                  aria-invalid={Boolean(errors.guardianLastName)}
                  aria-describedby={errors.guardianLastName ? "guardianLastName-error" : undefined}
                  {...register("guardianLastName")}
                />
                <FieldError id="guardianLastName-error" errors={[errors.guardianLastName]} />
              </Field>
            </div>
          </FieldSet>
        ) : null}

        <FieldSet>
          <FieldLegend>Dane kontaktowe</FieldLegend>
          <FieldDescription>
            {!hasKnownAge
              ? "Podaj telefon i e-mail osoby odpowiedzialnej za zgłoszenie."
              : isMinor
                ? "Podaj telefon i e-mail rodzica lub opiekuna odpowiedzialnego za zgłoszenie."
                : "Podaj telefon i e-mail uczestnika."}
          </FieldDescription>

          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="phone"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="phone">
                    Numer telefonu <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <PhoneNumberInput
                    id="phone"
                    name={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    required
                    autoComplete="tel"
                    invalid={fieldState.invalid}
                    describedBy={fieldState.invalid ? "phone-error" : undefined}
                  />
                  <FieldError id="phone-error" errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">
                Adres e-mail <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                id="email"
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                placeholder="adres@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              <FieldError id="email-error" errors={[errors.email]} />
            </Field>
          </div>
        </FieldSet>

        <input
          type="text"
          tabIndex={-1}
          inputMode="none"
          autoComplete="off"
          readOnly
          data-lpignore="true"
          data-1p-ignore="true"
          className="absolute left-[-9999px] h-px w-px opacity-0"
          aria-hidden="true"
          onFocus={(event) => {
            event.currentTarget.readOnly = false;
          }}
          {...register("website")}
        />
        <input type="hidden" {...register("requestId")} />
        <input type="hidden" {...register("renderedAt", { valueAsNumber: true })} />

        <div className="rounded-2xl border border-border bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">
          Wysłanie formularza jest zgłoszeniem na wybrane zajęcia, nie automatyczną rezerwacją
          miejsca. Pozytywka sprawdzi dostępność i skontaktuje się z Tobą w sprawie potwierdzenia
          udziału.
        </div>

        {settings.privacyNoticeUrl ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Przed wysłaniem zapoznaj się z{" "}
            <a
              href={settings.privacyNoticeUrl}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              informacją o przetwarzaniu danych
            </a>
            .
          </p>
        ) : null}

        {showValidationSummary ? (
          <div
            ref={validationSummaryRef}
            tabIndex={-1}
            data-validation-summary
            className="scroll-m-6 outline-none"
          >
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Sprawdź formularz</AlertTitle>
              <AlertDescription>
                Co najmniej jedno pole wymaga poprawy. Błędy są zaznaczone bezpośrednio przy
                odpowiednich polach.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {globalError ? (
          <Alert variant="destructive" role="alert">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Nie udało się wysłać zgłoszenia</AlertTitle>
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || !settings.registrationsOpen}
        >
          {isSubmitting
            ? "Wysyłanie..."
            : settings.registrationsOpen
              ? "Wyślij zgłoszenie"
              : "Zapisy są zamknięte"}
        </Button>
      </form>
    </Card>
  );
}
