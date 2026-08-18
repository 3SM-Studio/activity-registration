import { randomUUID } from "node:crypto";

import { asRegistrationId } from "@/domain/registration";

export function createRegistrationId() {
  return asRegistrationId(`reg_${randomUUID()}`);
}
