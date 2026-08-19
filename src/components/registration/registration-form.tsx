"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from "react";
import { CircleAlert } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { APPLICATION_ERROR_CODE } from "@/application/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { FieldError } from "@/components/registration/field-error";
import type { PublicCatalog } from "@/domain/catalog";
import type { PublicSettings } from "@/domain/settings";
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
}>;

function newRequestId(): string {
  return crypto.randomUUID();
}

export function RegistrationForm({ catalog, settings }: RegistrationFormProps) {
  const router = useRouter();
  const [renderedAt] = useState(() => Date.now());
  const [initialRequestId] = useState(newRequestId);
  const [success, setSuccess] = useState(false);
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
      guardianFirstName: "",
      guardianLastName: "",
      phone: "",
      email: "",
      renderedAt,
      website: "",
    },
  });

  const cityId = useWatch({ control, name: "cityId" });
  const age = useWatch({ control, name: "age" });
  const isMinor = typeof age === "number" && Number.isFinite(age) && age < 18;

  const availableOfferings = useMemo(
    () => catalog.offerings.filter((offering) => offering.cityId === cityId),
    [catalog.offerings, cityId],
  );

  const cityRegistration = register("cityId");
  const ageRegistration = register("age", { valueAsNumber: true });

  const onCityChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    cityRegistration.onChange(event);
    setValue("offeringId", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    clearErrors("offeringId");
  };

  const onAgeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    ageRegistration.onChange(event);
    const numericAge = event.currentTarget.valueAsNumber;

    if (Number.isFinite(numericAge) && numericAge >= 18) {
      setValue("guardianFirstName", "", { shouldDirty: true });
      setValue("guardianLastName", "", { shouldDirty: true });
      clearErrors(["guardianFirstName", "guardianLastName"]);
    }
  };

  useEffect(() => {
    if (!showValidationSummary) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      validationSummaryRef.current?.focus({ preventScroll: true });
      validationSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
          const nextRequestId = newRequestId();
          setValue("requestId", nextRequestId);
        }

        setGlobalError(failure.message || "Nie udało się wysłać zgłoszenia.");
        return;
      }

      setSuccess(true);
    } catch {
      setGlobalError(
        "Nie udało się połączyć z systemem zapisów. Twoje dane pozostały w formularzu. Spróbuj ponownie.",
      );
    }
  };

  if (!settings.registrationsOpen) {
    return (
      <Card className="text-center" aria-live="polite">
        <h2 className="text-xl font-semibold text-neutral-950">Zapisy są zamknięte</h2>
        <p className="mt-2 text-neutral-600">Formularz nie przyjmuje teraz nowych zgłoszeń.</p>
      </Card>
    );
  }

  if (catalog.cities.length === 0 || catalog.offerings.length === 0) {
    return (
      <Card className="text-center" aria-live="polite">
        <h2 className="text-xl font-semibold text-neutral-950">Brak dostępnych zajęć</h2>
        <p className="mt-2 text-neutral-600">Aktualnie nie ma zajęć dostępnych do zapisów.</p>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="text-center" aria-live="polite">
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800"
          aria-hidden="true"
        >
          ✓
        </div>
        <h2 className="text-xl font-semibold text-neutral-950">Zgłoszenie przyjęte</h2>
        <p className="mt-2 text-neutral-600">{settings.successMessage}</p>
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
        className="space-y-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="cityId">
              Miasto <span aria-hidden="true">*</span>
            </Label>
            <NativeSelect
              id="cityId"
              required
              aria-invalid={Boolean(errors.cityId)}
              aria-describedby={errors.cityId ? "cityId-error" : undefined}
              {...cityRegistration}
              onChange={onCityChange}
            >
              <option value="">Wybierz miasto</option>
              {catalog.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError id="cityId-error" message={errors.cityId?.message} />
          </div>

          <div>
            <Label htmlFor="offeringId">
              Zajęcia <span aria-hidden="true">*</span>
            </Label>
            <NativeSelect
              id="offeringId"
              required
              disabled={!cityId}
              aria-invalid={Boolean(errors.offeringId)}
              aria-describedby={errors.offeringId ? "offeringId-error" : undefined}
              {...register("offeringId")}
            >
              <option value="">{cityId ? "Wybierz zajęcia" : "Najpierw wybierz miasto"}</option>
              {availableOfferings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError id="offeringId-error" message={errors.offeringId?.message} />
          </div>
        </div>

        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-neutral-950">Dane uczestnika</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="participantFirstName">
                Imię <span aria-hidden="true">*</span>
              </Label>
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
              <FieldError
                id="participantFirstName-error"
                message={errors.participantFirstName?.message}
              />
            </div>

            <div>
              <Label htmlFor="participantLastName">
                Nazwisko <span aria-hidden="true">*</span>
              </Label>
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
              <FieldError
                id="participantLastName-error"
                message={errors.participantLastName?.message}
              />
            </div>
          </div>

          <div className="max-w-48">
            <Label htmlFor="age">
              Wiek <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="age"
              required
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              step={1}
              aria-invalid={Boolean(errors.age)}
              aria-describedby={errors.age ? "age-error" : undefined}
              {...ageRegistration}
              onChange={onAgeChange}
            />
            <FieldError id="age-error" message={errors.age?.message} />
          </div>
        </fieldset>

        {isMinor ? (
          <fieldset className="space-y-5 rounded-2xl bg-neutral-50 p-4 sm:p-5">
            <legend className="px-1 text-base font-semibold text-neutral-950">
              Rodzic lub opiekun
            </legend>
            <p className="text-sm text-neutral-600">
              Uczestnik jest niepełnoletni, dlatego potrzebujemy danych osoby odpowiedzialnej za
              zgłoszenie.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="guardianFirstName">
                  Imię rodzica lub opiekuna <span aria-hidden="true">*</span>
                </Label>
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
                <FieldError
                  id="guardianFirstName-error"
                  message={errors.guardianFirstName?.message}
                />
              </div>

              <div>
                <Label htmlFor="guardianLastName">
                  Nazwisko rodzica lub opiekuna <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id="guardianLastName"
                  required
                  autoComplete="family-name"
                  maxLength={100}
                  aria-invalid={Boolean(errors.guardianLastName)}
                  aria-describedby={errors.guardianLastName ? "guardianLastName-error" : undefined}
                  {...register("guardianLastName")}
                />
                <FieldError
                  id="guardianLastName-error"
                  message={errors.guardianLastName?.message}
                />
              </div>
            </div>
          </fieldset>
        ) : null}

        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-neutral-950">Dane kontaktowe</legend>
          <p className="text-sm text-neutral-600">
            {isMinor
              ? "Podaj telefon i e-mail rodzica lub opiekuna odpowiedzialnego za zgłoszenie."
              : "Podaj telefon i e-mail uczestnika."}
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">
                Numer telefonu <span aria-hidden="true">*</span>
              </Label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneNumberInput
                    id="phone"
                    name={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    required
                    autoComplete="tel"
                    invalid={Boolean(errors.phone)}
                    describedBy={errors.phone ? "phone-error" : undefined}
                  />
                )}
              />
              <FieldError id="phone-error" message={errors.phone?.message} />
            </div>

            <div>
              <Label htmlFor="email">
                Adres e-mail <span aria-hidden="true">*</span>
              </Label>
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
              <FieldError id="email-error" message={errors.email?.message} />
            </div>
          </div>
        </fieldset>

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

        {settings.privacyNoticeUrl ? (
          <p className="text-sm leading-6 text-neutral-600">
            Przed wysłaniem zapoznaj się z{" "}
            <a
              href={settings.privacyNoticeUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-neutral-950 underline underline-offset-4"
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
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {globalError}
          </div>
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

        <p className="text-center text-xs text-neutral-500">Pola oznaczone * są wymagane.</p>
      </form>
    </Card>
  );
}
