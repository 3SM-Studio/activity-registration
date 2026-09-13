import type { CatalogRow } from "@/config/pozytywka-offer-2026-2027";

type CatalogCorrections = Readonly<Record<string, Readonly<Partial<CatalogRow>>>>;

/**
 * Corrections accepted in the live 2026/2027 production catalog after the
 * original source snapshot was published. Keeping them explicit prevents a
 * later catalog refresh from rolling production back to stale hours or
 * re-enabling an intentionally disabled activity.
 *
 * Once the season source snapshot is regenerated from the approved schedule,
 * this compatibility layer can be removed.
 */
const OFFERING_CORRECTIONS: CatalogCorrections = {
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

const GROUP_CORRECTIONS: CatalogCorrections = {
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

function applyCorrections(
  rows: readonly CatalogRow[],
  idHeader: "OFFERING_ID" | "GROUP_ID",
  corrections: CatalogCorrections,
): readonly CatalogRow[] {
  return rows.map((row) => {
    const id = String(row[idHeader] ?? "");
    const correction = corrections[id];
    return correction ? { ...row, ...correction } : row;
  });
}

export function currentProductionOfferings2026_2027(
  rows: readonly CatalogRow[],
): readonly CatalogRow[] {
  return applyCorrections(rows, "OFFERING_ID", OFFERING_CORRECTIONS);
}

export function currentProductionGroups2026_2027(
  rows: readonly CatalogRow[],
): readonly CatalogRow[] {
  return applyCorrections(rows, "GROUP_ID", GROUP_CORRECTIONS);
}
