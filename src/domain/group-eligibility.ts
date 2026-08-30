import { calculateAgeAtDate } from "@/lib/birth-date";

/**
 * School-year groups normally use age at season start. Rolling activities can also
 * accept children born after the season started, where that calculation is negative.
 * In that one case the age at submission is the meaningful reference value.
 */
export function ageForGroupEligibility(
  birthDate: string,
  seasonStartDate: string,
  ageAtSubmission: number,
): number {
  const ageAtSeasonStart = calculateAgeAtDate(birthDate, seasonStartDate);
  return ageAtSeasonStart < 0 ? ageAtSubmission : ageAtSeasonStart;
}
