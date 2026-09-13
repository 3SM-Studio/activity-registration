import {
  POZYTYWKA_CITIES_2026_2027,
  POZYTYWKA_OFFERINGS_2026_2027,
  POZYTYWKA_SEASON_2026_2027,
  pozytywkaGroupsForSeason2026_2027,
  type CatalogRow,
} from "@/config/pozytywka-offer-2026-2027";

const OFFERING_OVERRIDES: Readonly<Record<string, Readonly<Partial<CatalogRow>>>> = {
  "olkusz-psikusy": {
    PUBLIC_DESCRIPTION:
      "Zespół wokalno-taneczny. Poniedziałki 17:00-18:00. Sala: mała sala. Opłata 160 zł / miesiąc.",
  },
  "olkusz-psotki": {
    PUBLIC_DESCRIPTION:
      "Zespół wokalno-taneczny dla dzieci. Poniedziałki 16:00-18:00. Sala: mała sala + klub. Opłata 230 zł / miesiąc.",
  },
  "olkusz-zespol-wokalny": {
    PUBLIC_DESCRIPTION:
      "Zajęcia dla dzieci 10+. Wtorki 16:15-17:15. Sala: sala muzyczna. Opłata 160 zł / miesiąc.",
  },
  "olkusz-plasanie": {
    PUBLIC_DESCRIPTION:
      "Zajęcia muzyczno-ruchowe dla dzieci do 4 lat z opiekunem. Środy 17:45-18:15. Sala: mała sala. Opłata 50 zł / zajęcia.",
  },
  "bukowno-folk-flow-tanczmy": {
    ACTIVE: "NIE",
  },
};

const GROUP_OVERRIDES: Readonly<Record<string, Readonly<Partial<CatalogRow>>>> = {
  "olkusz-psikusy-2026-2027": {
    DAY_OF_WEEK: "Poniedziałek",
    START_TIME: "17:00",
    END_TIME: "18:00",
    LOCATION: "Mała sala",
  },
  "olkusz-psotki-2026-2027": {
    DAY_OF_WEEK: "Poniedziałek",
    START_TIME: "16:00",
    END_TIME: "18:00",
    LOCATION: "Mała sala + klub",
  },
  "olkusz-zespol-wokalny-2026-2027": {
    DAY_OF_WEEK: "Wtorek",
    START_TIME: "16:15",
    END_TIME: "17:15",
    LOCATION: "Sala muzyczna",
  },
  "olkusz-plasanie-2026-2027": {
    DAY_OF_WEEK: "Środa",
    START_TIME: "17:45",
    END_TIME: "18:15",
    LOCATION: "Mała sala",
  },
  "bukowno-folk-flow-tanczmy-2026-2027": {
    ACTIVE: "NIE",
  },
};

function applyOverrides(
  rows: readonly CatalogRow[],
  idHeader: "OFFERING_ID" | "GROUP_ID",
  overrides: Readonly<Record<string, Readonly<Partial<CatalogRow>>>>,
): readonly CatalogRow[] {
  return rows.map((row) => {
    const id = String(row[idHeader] ?? "");
    const override = overrides[id];
    return override ? ({ ...row, ...override } as CatalogRow) : row;
  });
}

export { POZYTYWKA_CITIES_2026_2027, POZYTYWKA_SEASON_2026_2027 };

export const POZYTYWKA_EFFECTIVE_OFFERINGS_2026_2027 = applyOverrides(
  POZYTYWKA_OFFERINGS_2026_2027,
  "OFFERING_ID",
  OFFERING_OVERRIDES,
);

export function pozytywkaEffectiveGroupsForSeason2026_2027(
  seasonId = POZYTYWKA_SEASON_2026_2027.SEASON_ID,
): readonly CatalogRow[] {
  return applyOverrides(
    pozytywkaGroupsForSeason2026_2027(seasonId),
    "GROUP_ID",
    GROUP_OVERRIDES,
  );
}
