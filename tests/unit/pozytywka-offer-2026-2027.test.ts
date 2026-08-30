import { describe, expect, it } from "vitest";

import {
  POZYTYWKA_CITIES_2026_2027,
  POZYTYWKA_OFFERINGS_2026_2027,
  POZYTYWKA_SEASON_2026_2027,
  pozytywkaGroupsForSeason2026_2027,
} from "@/config/pozytywka-offer-2026-2027";

describe("Pozytywka 2026/2027 offer catalog", () => {
  const groups = pozytywkaGroupsForSeason2026_2027(POZYTYWKA_SEASON_2026_2027.SEASON_ID);

  it("contains the declared 3 locations and 18 public offerings", () => {
    expect(POZYTYWKA_CITIES_2026_2027).toHaveLength(3);
    expect(POZYTYWKA_OFFERINGS_2026_2027).toHaveLength(18);
    expect(groups).toHaveLength(18);
  });

  it("uses unique technical IDs and gives every offering exactly one active group", () => {
    const offeringIds = POZYTYWKA_OFFERINGS_2026_2027.map((row) => String(row.OFFERING_ID));
    const groupIds = groups.map((row) => String(row.GROUP_ID));

    expect(new Set(offeringIds).size).toBe(offeringIds.length);
    expect(new Set(groupIds).size).toBe(groupIds.length);

    for (const offeringId of offeringIds) {
      expect(groups.filter((row) => row.OFFERING_ID === offeringId)).toHaveLength(1);
    }
  });

  it("does not carry forward unconfirmed instructors or capacities", () => {
    for (const group of groups) {
      expect(group.INSTRUCTOR).toBe("");
      expect(group.CAPACITY).toBe("");
    }
  });

  it("uses confirmed durations when the source listed only a start time", () => {
    const endTimes = Object.fromEntries(
      groups.map((row) => [String(row.OFFERING_ID), String(row.END_TIME)]),
    );

    expect(endTimes).toMatchObject({
      "olkusz-zespol-wokalny": "19:30",
      "olkusz-stepdance": "19:15",
      "olkusz-acrodance-5-8": "17:15",
      "olkusz-acrodance-9-plus": "18:15",
      "olkusz-plasanie": "18:00",
      "bukowno-inside-5-8": "16:15",
      "bukowno-inside-9-plus": "18:45",
      "bukowno-babeczki": "19:45",
    });
  });

  it("keeps Street Dance Squad as one group with both weekly sessions", () => {
    const squad = groups.find((row) => row.OFFERING_ID === "bukowno-synteza-street-dance-squad");

    expect(squad).toMatchObject({
      AGE_MIN: 9,
      AGE_MAX: 12,
      DAY_OF_WEEK: "Śr 16:15-17:15 + czw 18:45-19:45",
      START_TIME: "",
      END_TIME: "",
    });
  });

  it("keeps unknown Babeczki age unrestricted instead of inventing a range", () => {
    const babeczki = groups.find((row) => row.OFFERING_ID === "bukowno-babeczki");

    expect(babeczki).toMatchObject({ AGE_MIN: "", AGE_MAX: "" });
  });
});
