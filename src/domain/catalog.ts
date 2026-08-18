export const TECHNICAL_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,99}$/;

export function isTechnicalId(value: string): boolean {
  return TECHNICAL_ID_PATTERN.test(value);
}

export type CityId = string & { readonly __brand: "CityId" };
export type OfferingId = string & { readonly __brand: "OfferingId" };

export type City = Readonly<{
  id: CityId;
  name: string;
  active: boolean;
  sortOrder: number;
}>;

export type ClassOffering = Readonly<{
  id: OfferingId;
  cityId: CityId;
  name: string;
  active: boolean;
  sortOrder: number;
}>;

export type PublicCity = Pick<City, "id" | "name" | "sortOrder">;
export type PublicOffering = Pick<ClassOffering, "id" | "cityId" | "name" | "sortOrder">;

export type PublicCatalog = Readonly<{
  cities: readonly PublicCity[];
  offerings: readonly PublicOffering[];
}>;

export function asCityId(value: string): CityId {
  return value as CityId;
}

export function asOfferingId(value: string): OfferingId {
  return value as OfferingId;
}
