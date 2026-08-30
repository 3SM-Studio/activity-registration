import { NextResponse } from "next/server";

import { reconcileRegistrationNotifications } from "@/application/notification-outbox";
import { createRegistrationNotificationDependencies } from "@/infrastructure/email";
import { createApplicationRepositories } from "@/infrastructure/repositories";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request, secret: string): boolean {
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  let env;

  try {
    env = getServerEnv();
  } catch {
    logger.error("notifications.cron.environment_invalid");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (!env.CRON_SECRET) {
    logger.error("notifications.cron.secret_missing");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (!authorized(request, env.CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const notificationDependencies = createRegistrationNotificationDependencies(env);
  if (!notificationDependencies) {
    logger.error("notifications.cron.email_disabled");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const repositories = createApplicationRepositories();
  const outbox = repositories.notifications;
  if (!outbox) {
    logger.error("notifications.cron.outbox_missing");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const registrationRepository = repositories.registrations;
  const listRegistrations = registrationRepository.listAll?.bind(registrationRepository);
  if (!listRegistrations) {
    logger.error("notifications.cron.registration_listing_missing");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const registrations = await listRegistrations();
    const result = await reconcileRegistrationNotifications(registrations, {
      ...notificationDependencies,
      outbox,
    });

    const level = result.failed > 0 ? "warn" : "info";
    logger[level]("notifications.cron.completed", {
      warningCount: result.failed,
    });

    return NextResponse.json({
      ok: result.failed === 0,
      registrations: result.registrations,
      attempted: result.attempted,
      failed: result.failed,
    });
  } catch {
    logger.error("notifications.cron.failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
