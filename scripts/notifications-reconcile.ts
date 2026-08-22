import { reconcileRegistrationNotifications } from "../src/application/notification-outbox";
import { createRegistrationNotificationDependencies } from "../src/infrastructure/email";
import { createApplicationRepositories } from "../src/infrastructure/repositories";
import { getServerEnv } from "../src/lib/env";

async function main() {
  const env = getServerEnv();
  const repositories = createApplicationRepositories();
  const outbox = repositories.notifications;
  const listRegistrations = repositories.registrations.listAll;
  const notificationDependencies = createRegistrationNotificationDependencies(env);

  if (!outbox || !listRegistrations) {
    throw new Error("Durable notification repositories are not available for this backend.");
  }
  if (!notificationDependencies) {
    throw new Error("E-mail notifications are disabled or not configured.");
  }

  const registrations = await listRegistrations.call(repositories.registrations);
  const forceFailed = process.argv.includes("--force-failed");
  const result = await reconcileRegistrationNotifications(
    registrations,
    { ...notificationDependencies, outbox },
    { forceFailed },
  );

  console.info(JSON.stringify({ ok: result.failed === 0, forceFailed, ...result }, null, 2));
  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unknown notification reconciliation error.",
  );
  process.exitCode = 1;
});
