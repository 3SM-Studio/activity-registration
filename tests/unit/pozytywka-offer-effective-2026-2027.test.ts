import { describe, expect, it } from "vitest";

import {
  POZYTYWKA_EFFECTIVE_OFFERINGS_2026_2027,
  pozytywkaEffectiveGroupsForSeason2026_2027,
} from "@/config/pozytywka-offer-2026-2027-effective";

function offering(id: string) {
  return POZYTYWKA_EFFECTIVE_OFFERINGS_2026_2027.find((row) => row.OFFERING_ID === id);
}

function group(id: string) {
  return pozytywkaEffectiveGroupsForSeason2026_2027().find((row) => row.GROUP_ID === id);
}

describe("effective Pozytywka 2026/2027 production catalog", () => {
  it("keeps the verified Olkusz schedule corrections", () => {
    expect(offering("olkusz-psikusy")?.PUBLIC_DESCRIPTION).toContain("17:00-18:00");
    expect(group("olkusz-psikusy-2026-2027")).toMatchObject({
      DAY_OF_WEEK: "Poniedziałek",
      START_TIME: "17:00",
      END_TIME: "18:00",
      LOCATION: "Mała sala",
    });

    expect(offering("olkusz-psotki")?.PUBLIC_DESCRIPTION).toContain("16:00-18:00");
    expect(group("olkusz-psotki-2026-2027")).toMatchObject({
      DAY_OF_WEEK: "Poniedziałek",
      START_TIME: "16:00",
      END_TIME: "18:00",
      LOCATION: "Mała sala + klub",
    });

    expect(group("olkusz-zespol-wokalny-2026-2027")).toMatchObject({
      DAY_OF_WEEK: "Wtorek",
      START_TIME: "16:15",
      END_TIME: "17:15",
      LOCATION: "Sala muzyczna",
    });

    expect(group("olkusz-plasanie-2026-2027")).toMatchObject({
      DAY_OF_WEEK: "Środa",
      START_TIME: "17:45",
      END_TIME: "18:15",
      LOCATION: "Mała sala",
    });
  });

  it("keeps Bukowno Folk & Flow disabled without affecting the Olkusz offering", () => {
    expect(offering("bukowno-folk-flow-tanczmy")?.ACTIVE).toBe("NIE");
    expect(group("bukowno-folk-flow-tanczmy-2026-2027")?.ACTIVE).toBe("NIE");

    expect(offering("olkusz-folk-flow-tanczmy")?.ACTIVE).toBe("TAK");
    expect(group("olkusz-folk-flow-tanczmy-2026-2027")?.ACTIVE).toBe("TAK");
  });
});
