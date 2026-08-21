import type { InternalGroup, Season } from "../src/domain/catalog";
import { classifyRegistrationDuplicates } from "../src/domain/registration-duplicates";
import { REGISTRATION_STATUS, type Registration } from "../src/domain/registration";
import { createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  parseGroupRow,
  parseRegistrationRow,
  parseSeasonRow,
} from "../src/infrastructure/google/parsers";
import {
  GROUP_HEADERS,
  REGISTRATION_HEADERS,
  SEASON_HEADERS,
  SHEET,
} from "../src/infrastructure/google/sheets-contracts";
import { calculateAgeAtDate } from "../src/lib/birth-date";
import { createAdminSheetsClient } from "./_google-admin";

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicatesSet = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }
    if (seen.has(value)) {
      duplicatesSet.add(value);
    }
    seen.add(value);
  }

  return [...duplicatesSet];
}

function businessDuplicatePairs(registrations: readonly Registration[]) {
  const exact = new Set<string>();
  const probable = new Set<string>();

  registrations.forEach((registration, index) => {
    if (!registration.seasonId || !registration.birthDate) {
      return;
    }

    const criteria = {
      seasonId: registration.seasonId,
      offeringId: registration.offeringId,
      cityId: registration.cityIdSnapshot,
      participantFirstName: registration.participantFirstName,
      participantLastName: registration.participantLastName,
      birthDate: registration.birthDate,
      phone: registration.phone,
      email: registration.email,
    } as const;

    for (const candidate of registrations.slice(index + 1)) {
      const match = classifyRegistrationDuplicates([candidate], criteria);
      if (match.kind === "none") {
        continue;
      }

      const pair = [registration.id, match.registration.id].sort().join(":");
      if (match.kind === "exact") {
        exact.add(pair);
      } else {
        probable.add(pair);
      }
    }
  });

  return {
    exactActiveBusinessDuplicatePairs: [...exact],
    probableBusinessDuplicatePairs: [...probable],
  };
}

function groupSupportsAge(group: InternalGroup, age: number): boolean {
  return (
    (group.ageMin === null || age >= group.ageMin) && (group.ageMax === null || age <= group.ageMax)
  );
}

function timestampOrderInvalid(left: string | null, right: string | null): boolean {
  if (!left || !right) {
    return false;
  }
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  return !Number.isNaN(leftMs) && !Number.isNaN(rightMs) && rightMs < leftMs;
}

function workflowIssues(
  registrations: readonly Registration[],
  seasons: readonly Season[],
  groups: readonly InternalGroup[],
) {
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const invalidSeasonReference: string[] = [];
  const invalidAssignedGroupReference: string[] = [];
  const groupOfferingMismatch: string[] = [];
  const groupSeasonMismatch: string[] = [];
  const assignedGroupAgeMismatch: string[] = [];
  const noEligibleGroupForOffering: string[] = [];
  const confirmedWithoutGroup: string[] = [];
  const contactedWithoutDate: string[] = [];
  const confirmedWithoutDate: string[] = [];
  const closedWithoutDate: string[] = [];
  const unexpectedClosedDate: string[] = [];
  const timestampSequenceErrors: string[] = [];

  for (const registration of registrations) {
    if (!registration.seasonId) {
      continue;
    }
    const season = seasonById.get(registration.seasonId);
    if (!season) {
      invalidSeasonReference.push(registration.id);
      continue;
    }

    if (registration.status === REGISTRATION_STATUS.confirmed && !registration.assignedGroupId) {
      confirmedWithoutGroup.push(registration.id);
    }
    if (
      (registration.status === REGISTRATION_STATUS.contacted ||
        registration.status === REGISTRATION_STATUS.confirmed) &&
      !registration.contactedAt
    ) {
      contactedWithoutDate.push(registration.id);
    }
    if (registration.status === REGISTRATION_STATUS.confirmed && !registration.confirmedAt) {
      confirmedWithoutDate.push(registration.id);
    }

    const terminalWithoutConfirmation =
      registration.status === REGISTRATION_STATUS.rejected ||
      registration.status === REGISTRATION_STATUS.cancelled;
    if (terminalWithoutConfirmation && !registration.closedAt) {
      closedWithoutDate.push(registration.id);
    }
    if (!terminalWithoutConfirmation && registration.closedAt) {
      unexpectedClosedDate.push(registration.id);
    }
    if (
      timestampOrderInvalid(registration.contactedAt, registration.confirmedAt) ||
      timestampOrderInvalid(registration.submittedAt, registration.contactedAt) ||
      timestampOrderInvalid(registration.submittedAt, registration.confirmedAt) ||
      timestampOrderInvalid(registration.submittedAt, registration.closedAt)
    ) {
      timestampSequenceErrors.push(registration.id);
    }

    if (registration.birthDate) {
      const ageAtSeasonStart = calculateAgeAtDate(registration.birthDate, season.startDate);
      const eligibleGroups = groups.filter(
        (group) =>
          group.active &&
          group.seasonId === season.id &&
          group.offeringId === registration.offeringId &&
          groupSupportsAge(group, ageAtSeasonStart),
      );
      if (eligibleGroups.length === 0) {
        noEligibleGroupForOffering.push(registration.id);
      }

      if (registration.assignedGroupId) {
        const group = groupById.get(registration.assignedGroupId);
        if (!group) {
          invalidAssignedGroupReference.push(registration.id);
        } else {
          if (group.offeringId !== registration.offeringId) {
            groupOfferingMismatch.push(registration.id);
          }
          if (group.seasonId !== season.id) {
            groupSeasonMismatch.push(registration.id);
          }
          if (!groupSupportsAge(group, ageAtSeasonStart)) {
            assignedGroupAgeMismatch.push(registration.id);
          }
        }
      }
    }
  }

  const capacityExceeded = groups.flatMap((group) => {
    if (!group.active || group.capacity === null) {
      return [];
    }
    const confirmed = registrations.filter(
      (registration) =>
        registration.status === REGISTRATION_STATUS.confirmed &&
        registration.assignedGroupId === group.id,
    ).length;
    return confirmed > group.capacity
      ? [{ groupId: group.id, capacity: group.capacity, confirmed }]
      : [];
  });

  return {
    invalidSeasonReference,
    invalidAssignedGroupReference,
    groupOfferingMismatch,
    groupSeasonMismatch,
    assignedGroupAgeMismatch,
    noEligibleGroupForOffering,
    confirmedWithoutGroup,
    contactedWithoutDate,
    confirmedWithoutDate,
    closedWithoutDate,
    unexpectedClosedDate,
    timestampSequenceErrors,
    capacityExceeded,
  };
}

async function main() {
  const client = createAdminSheetsClient();
  const [registrationRows, seasonRows, groupRows] = await Promise.all([
    client.getValues(`${SHEET.registrations}!A:ZZ`, { valueRenderOption: "UNFORMATTED_VALUE" }),
    client.getValues(`${SHEET.seasons}!A:ZZ`, { valueRenderOption: "UNFORMATTED_VALUE" }),
    client.getValues(`${SHEET.groups}!A:ZZ`, { valueRenderOption: "UNFORMATTED_VALUE" }),
  ]);

  const registrationHeaders = createHeaderMap(registrationRows[0] ?? [], REGISTRATION_HEADERS);
  const seasonHeaders = createHeaderMap(seasonRows[0] ?? [], SEASON_HEADERS);
  const groupHeaders = createHeaderMap(groupRows[0] ?? [], GROUP_HEADERS);

  const registrations = registrationRows
    .slice(1)
    .map((row) => parseRegistrationRow(row, registrationHeaders))
    .filter((registration): registration is Registration => registration !== null);
  const seasons = seasonRows
    .slice(1)
    .map((row) => parseSeasonRow(row, seasonHeaders))
    .filter((season): season is Season => season !== null);
  const groups = groupRows
    .slice(1)
    .map((row) => parseGroupRow(row, groupHeaders))
    .filter((group): group is InternalGroup => group !== null);

  const requestIds = registrations.map((registration) => registration.requestId);
  const registrationIds = registrations.map((registration) => registration.id);
  const incompleteTechnicalIds = Math.max(0, registrationRows.length - 1 - registrations.length);
  const businessDuplicates = businessDuplicatePairs(registrations);
  const workflow = workflowIssues(registrations, seasons, groups);

  const report = {
    mode: "dry-run",
    rowCount: registrationRows.length > 0 ? registrationRows.length - 1 : 0,
    duplicateRequestIds: duplicates(requestIds),
    duplicateRegistrationIds: duplicates(registrationIds),
    incompleteTechnicalIds,
    ...businessDuplicates,
    workflow,
  };

  console.info(JSON.stringify(report, null, 2));

  const workflowIssueCount = Object.values(workflow).reduce(
    (sum, values) => sum + values.length,
    0,
  );
  if (
    report.duplicateRequestIds.length > 0 ||
    report.duplicateRegistrationIds.length > 0 ||
    report.exactActiveBusinessDuplicatePairs.length > 0 ||
    report.probableBusinessDuplicatePairs.length > 0 ||
    incompleteTechnicalIds > 0 ||
    workflowIssueCount > 0
  ) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown reconciliation error.");
  process.exitCode = 1;
});
