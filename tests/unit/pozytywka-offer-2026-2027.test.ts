import { describe, expect, it } from "vitest";

import {
  POZYTYWKA_CITIES_2026_2027,
  POZYTYWKA_OFFERINGS_2026_2027,
  POZYTYWKA_SEASON_2026_2027,
  pozytywkaGroupsForSeason2026_2027,
} from "@/config/pozytywka-offer-2026-2027";

describe("Pozytywka 2026/2027 offer catalog", () => {
  const groups = pozytywkaGroupsForSeason2026_2027(POZYTYWKA_SEASON_2026_2027.SEASON_ID);

  it("contains the declared 3 locations, 34 public offerings and 34 groups", () => {
    expect(POZYTYWKA_CITIES_2026_2027).toHaveLength(3);
    expect(POZYTYWKA_OFFERINGS_2026_2027).toHaveLength(34);
    expect(groups).toHaveLength(34);
  });

  it("contains 21 Olkusz, 8 Bukowno and 5 Boleslaw offerings", () => {
    const counts = POZYTYWKA_OFFERINGS_2026_2027.reduce<Record<string, number>>((result, row) => {
      const cityId = String(row.CITY_ID);
      result[cityId] = (result[cityId] ?? 0) + 1;
      return result;
    }, {});

    expect(counts).toEqual({ olkusz: 21, bukowno: 8, boleslaw: 5 });
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

  it("keeps the stable Plasanie technical ID while updating the public name to Plasanki", () => {
    const offering = POZYTYWKA_OFFERINGS_2026_2027.find(
      (row) => row.OFFERING_ID === "olkusz-plasanie",
    );
    const group = groups.find((row) => row.OFFERING_ID === "olkusz-plasanie");

    expect(offering?.NAME).toBe("Pląsanki · do 4 lat z opiekunem");
    expect(group?.NAME).toBe("Pląsanki");
  });

  it("replaces active Bukowno Babeczki with FOLK & FLOW", () => {
    const offeringIds = POZYTYWKA_OFFERINGS_2026_2027.map((row) => String(row.OFFERING_ID));

    expect(offeringIds).not.toContain("bukowno-babeczki");
    expect(offeringIds).toContain("bukowno-folk-flow-tanczmy");
  });

  it("uses the confirmed 60-minute default for start-only classes and 30 minutes for Plasanki", () => {
    const endTimes = Object.fromEntries(
      groups.map((row) => [String(row.OFFERING_ID), String(row.END_TIME)]),
    );

    expect(endTimes).toMatchObject({
      "olkusz-zespol-wokalny": "19:30",
      "olkusz-stepdance": "19:15",
      "olkusz-acrodance-5-8": "17:15",
      "olkusz-acrodance-9-plus": "18:15",
      "olkusz-plasanie": "18:00",
      "olkusz-folk-flow-tanczmy": "19:00",
      "olkusz-street-dance-freestyle": "11:00",
      "olkusz-stretching-tancerzy": "12:00",
      "olkusz-stretching-dorosli": "20:15",
      "olkusz-male-raczki-wielka-sztuka": "17:00",
      "olkusz-art-misja": "18:00",
      "olkusz-cafe-akwarela": "19:00",
      "olkusz-hello-melo-4-5": "17:15",
      "olkusz-hello-melo-2-4": "18:15",
      "bukowno-inside-5-8": "16:15",
      "bukowno-inside-9-plus": "18:45",
      "bukowno-folk-flow-tanczmy": "19:45",
      "boleslaw-psikusy": "18:00",
      "boleslaw-hello-melo-3-6": "17:00",
    });
  });

  it("keeps both Street Dance Squad schedules as one group per offering", () => {
    const olkuszSquad = groups.find(
      (row) => row.OFFERING_ID === "olkusz-synteza-street-dance-squad",
    );
    const bukownoSquad = groups.find(
      (row) => row.OFFERING_ID === "bukowno-synteza-street-dance-squad",
    );

    expect(olkuszSquad).toMatchObject({
      AGE_MIN: 10,
      AGE_MAX: 13,
      DAY_OF_WEEK: "Pon 16:00-17:00 + pt 16:00-17:00",
      START_TIME: "",
      END_TIME: "",
    });
    expect(bukownoSquad).toMatchObject({
      AGE_MIN: 9,
      AGE_MAX: 12,
      DAY_OF_WEEK: "Śr 16:15-17:15 + czw 18:45-19:45",
      START_TIME: "",
      END_TIME: "",
    });
  });

  it("maps adult and 16+ groups without inventing an upper age limit", () => {
    for (const offeringId of [
      "olkusz-stepdance",
      "olkusz-folk-flow-tanczmy",
      "olkusz-stretching-dorosli",
      "olkusz-cafe-akwarela",
      "bukowno-folk-flow-tanczmy",
    ]) {
      expect(groups.find((row) => row.OFFERING_ID === offeringId)).toMatchObject({
        AGE_MIN: 18,
        AGE_MAX: "",
      });
    }

    expect(
      groups.find((row) => row.OFFERING_ID === "olkusz-synteza-street-dance-open"),
    ).toMatchObject({ AGE_MIN: 16, AGE_MAX: "" });
  });

  it("keeps unspecified Freestyle and dancer-stretching ages unrestricted", () => {
    for (const offeringId of ["olkusz-street-dance-freestyle", "olkusz-stretching-tancerzy"]) {
      expect(groups.find((row) => row.OFFERING_ID === offeringId)).toMatchObject({
        AGE_MIN: "",
        AGE_MAX: "",
      });
    }
  });

  it("does not invent a weekday for Ale Drama", () => {
    expect(groups.find((row) => row.OFFERING_ID === "boleslaw-teatr-ale-drama")).toMatchObject({
      AGE_MIN: 0,
      AGE_MAX: 17,
      DAY_OF_WEEK: "",
      START_TIME: "18:00",
      END_TIME: "19:30",
    });
  });
});
