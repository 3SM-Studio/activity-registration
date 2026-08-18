import type { RegistrationNotificationDependencies } from "@/application/registration-notifications";
import { ResendEmailSender } from "@/infrastructure/email/resend-email-sender";
import type { ServerEnv } from "@/lib/env";

export function createRegistrationNotificationDependencies(
  env: ServerEnv,
): RegistrationNotificationDependencies | null {
  if (env.EMAIL_PROVIDER === "disabled") {
    return null;
  }

  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.REGISTRATION_ADMIN_EMAILS) {
    throw new Error("Email provider configuration is incomplete.");
  }

  return {
    sender: new ResendEmailSender(env.RESEND_API_KEY),
    from: env.EMAIL_FROM,
    adminEmails: env.REGISTRATION_ADMIN_EMAILS,
  };
}
