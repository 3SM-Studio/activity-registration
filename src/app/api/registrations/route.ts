import { after, NextResponse } from "next/server";

import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import { sendRegistrationNotifications } from "@/application/registration-notifications";
import { submitRegistration } from "@/application/submit-registration";
import { isRequestId } from "@/domain/registration";
import { createRegistrationNotificationDependencies } from "@/infrastructure/email";
import { SheetsApiError } from "@/infrastructure/google/sheets-client";
import { createApplicationRepositories } from "@/infrastructure/repositories";
import {
  getServerEnv,
  isUnconfiguredVercelPreview,
  isUnconfiguredVercelProduction,
} from "@/lib/env";
import { logger } from "@/lib/logger";

const MAX_BODY_BYTES = 16_384;

type SubmitStage = "environment" | "repositories" | "notifications" | "registration";

function statusForApplicationError(code: string): number {
  switch (code) {
    case APPLICATION_ERROR_CODE.validation:
      return 400;
    case APPLICATION_ERROR_CODE.registrationsClosed:
    case APPLICATION_ERROR_CODE.cityNotAvailable:
    case APPLICATION_ERROR_CODE.offeringNotAvailable:
    case APPLICATION_ERROR_CODE.offeringCityMismatch:
    case APPLICATION_ERROR_CODE.requestIdConflict:
      return 409;
    case APPLICATION_ERROR_CODE.systemNotReady:
    case APPLICATION_ERROR_CODE.temporaryUnavailable:
      return 503;
    default:
      return 500;
  }
}

function safeRequestId(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "requestId" in value &&
    typeof value.requestId === "string" &&
    isRequestId(value.requestId)
  ) {
    return value.requestId;
  }

  return undefined;
}

function unavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: APPLICATION_ERROR_CODE.systemNotReady,
      message: "Zapisy są obecnie niedostępne.",
    },
    { status: 503 },
  );
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isUnconfiguredVercelProduction()) {
    logger.warn("registration.submit.production_not_configured");
    return unavailableResponse();
  }

  if (isUnconfiguredVercelPreview()) {
    logger.warn("registration.submit.preview_not_configured");
    return unavailableResponse();
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      {
        ok: false,
        code: APPLICATION_ERROR_CODE.validation,
        message: "Nieprawidłowy format zgłoszenia.",
      },
      { status: 415 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        code: APPLICATION_ERROR_CODE.validation,
        message: "Zgłoszenie jest zbyt duże.",
      },
      { status: 413 },
    );
  }

  let raw: unknown;

  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          code: APPLICATION_ERROR_CODE.validation,
          message: "Zgłoszenie jest zbyt duże.",
        },
        { status: 413 },
      );
    }
    raw = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: APPLICATION_ERROR_CODE.validation,
        message: "Nieprawidłowy JSON.",
      },
      { status: 400 },
    );
  }

  const requestId = safeRequestId(raw);
  let stage: SubmitStage = "environment";

  try {
    const env = getServerEnv();

    stage = "repositories";
    const repositories = createApplicationRepositories();

    stage = "notifications";
    const notificationDependencies = createRegistrationNotificationDependencies(env);

    stage = "registration";
    const result = await submitRegistration(raw, {
      repositories,
      requirePrivacyConfiguration: env.APP_ENV === "production",
    });

    logger.info("registration.submit.succeeded", {
      ...(requestId ? { requestId } : {}),
      registrationId: result.registrationId,
      idempotentReplay: result.idempotentReplay,
      businessDuplicate: result.businessDuplicate,
    });

    if (notificationDependencies && !result.idempotentReplay && !result.businessDuplicate) {
      after(async () => {
        try {
          const notificationResult = await sendRegistrationNotifications(
            result.registration,
            notificationDependencies,
          );

          if (notificationResult.failed > 0) {
            logger.warn("registration.notifications.partial_failure", {
              ...(requestId ? { requestId } : {}),
              registrationId: result.registrationId,
              warningCount: notificationResult.failed,
            });
            return;
          }

          logger.info("registration.notifications.succeeded", {
            ...(requestId ? { requestId } : {}),
            registrationId: result.registrationId,
          });
        } catch {
          logger.error("registration.notifications.failed", {
            ...(requestId ? { requestId } : {}),
            registrationId: result.registrationId,
          });
        }
      });
    }

    return NextResponse.json(
      {
        ok: true,
        registrationId: result.registrationId,
        duplicate: result.businessDuplicate,
      },
      { status: result.idempotentReplay || result.businessDuplicate ? 200 : 201 },
    );
  } catch (error) {
    const errorType = error instanceof Error ? error.name : typeof error;

    if (error instanceof ApplicationError) {
      logger.warn("registration.submit.rejected", {
        ...(requestId ? { requestId } : {}),
        code: error.code,
        stage,
        errorType,
      });

      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
        { status: statusForApplicationError(error.code) },
      );
    }

    if (error instanceof SheetsApiError) {
      logger.error("registration.submit.sheets_failed", {
        ...(requestId ? { requestId } : {}),
        status: error.status,
        stage,
        errorType,
      });

      return NextResponse.json(
        {
          ok: false,
          code: APPLICATION_ERROR_CODE.temporaryUnavailable,
          message: "System zapisów jest chwilowo niedostępny. Spróbuj ponownie za moment.",
        },
        { status: 503 },
      );
    }

    logger.error("registration.submit.failed", {
      ...(requestId ? { requestId } : {}),
      stage,
      errorType,
    });

    return NextResponse.json(
      {
        ok: false,
        code: APPLICATION_ERROR_CODE.internal,
        message: "Nie udało się wysłać zgłoszenia. Spróbuj ponownie za moment.",
      },
      { status: 500 },
    );
  }
}
