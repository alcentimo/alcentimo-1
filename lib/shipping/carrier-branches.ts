import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import mrwBranchesData from "@/lib/shipping/data/mrw-branches.ve.json";
import tealcaBranchesData from "@/lib/shipping/data/tealca-branches.ve.json";
import zoomBranchesData from "@/lib/shipping/data/zoom-branches.ve.json";
import domesaBranchesData from "@/lib/shipping/data/domesa-branches.ve.json";
import libertyBranchesData from "@/lib/shipping/data/liberty-express-branches.ve.json";

export interface CarrierBranch {
  id: string;
  carrier: ShippingCarrierKey;
  name: string;
  city: string;
  state: string;
  address: string;
  /** Official agency / office code when available. */
  code?: string;
}

type BranchRecord = {
  code: string;
  name: string;
  city: string;
  state: string;
  address: string;
};

type BranchSeed = Omit<CarrierBranch, "id" | "carrier" | "code"> & {
  code?: string;
};

const CATALOG_BY_CARRIER: Record<
  Extract<
    ShippingCarrierKey,
    "mrw" | "tealca" | "zoom" | "domesa" | "libertyExpress"
  >,
  BranchRecord[]
> = {
  mrw: mrwBranchesData as BranchRecord[],
  tealca: tealcaBranchesData as BranchRecord[],
  zoom: zoomBranchesData as BranchRecord[],
  domesa: domesaBranchesData as BranchRecord[],
  libertyExpress: libertyBranchesData as BranchRecord[],
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildBranchId(
  carrier: ShippingCarrierKey,
  seed: BranchSeed,
): string {
  if (seed.code) {
    return `${carrier}-${seed.code}`;
  }
  return `${carrier}-${slugify(seed.city)}-${slugify(seed.name)}`;
}

function mapSeed(
  carrier: ShippingCarrierKey,
  seed: BranchSeed,
): CarrierBranch {
  return {
    id: buildBranchId(carrier, seed),
    carrier,
    name: seed.name,
    city: seed.city,
    state: seed.state,
    address: seed.address,
    ...(seed.code ? { code: seed.code } : {}),
  };
}

function loadCatalog(carrier: ShippingCarrierKey): CarrierBranch[] {
  const rows = CATALOG_BY_CARRIER[carrier as keyof typeof CATALOG_BY_CARRIER];
  if (!rows?.length) return [];
  return rows.map((row) =>
    mapSeed(carrier, {
      code: row.code,
      name: row.name,
      city: row.city,
      state: row.state,
      address: row.address,
    }),
  );
}

export const CARRIER_BRANCHES: CarrierBranch[] = (
  Object.keys(CATALOG_BY_CARRIER) as Array<keyof typeof CATALOG_BY_CARRIER>
).flatMap((carrier) => loadCatalog(carrier));

const BRANCHES_BY_ID = new Map(
  CARRIER_BRANCHES.map((branch) => [branch.id, branch]),
);

const BRANCHES_BY_CARRIER = new Map<ShippingCarrierKey, CarrierBranch[]>();
for (const branch of CARRIER_BRANCHES) {
  const list = BRANCHES_BY_CARRIER.get(branch.carrier);
  if (list) list.push(branch);
  else BRANCHES_BY_CARRIER.set(branch.carrier, [branch]);
}

function compareEs(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

export function getCarrierBranches(
  carrier: ShippingCarrierKey,
): CarrierBranch[] {
  return BRANCHES_BY_CARRIER.get(carrier) ?? [];
}

export function getCarrierBranchById(
  branchId: string | null | undefined,
): CarrierBranch | null {
  if (!branchId?.trim()) return null;
  return BRANCHES_BY_ID.get(branchId.trim()) ?? null;
}

export function getCarrierStates(carrier: ShippingCarrierKey): string[] {
  const states = new Set(getCarrierBranches(carrier).map((b) => b.state));
  return [...states].sort(compareEs);
}

export function getCarrierCities(
  carrier: ShippingCarrierKey,
  state: string,
): string[] {
  const foldedState = foldSearchText(state);
  const cities = new Set(
    getCarrierBranches(carrier)
      .filter((b) => foldSearchText(b.state) === foldedState)
      .map((b) => b.city),
  );
  return [...cities].sort(compareEs);
}

export function getCarrierBranchesByLocation(
  carrier: ShippingCarrierKey,
  state: string | null | undefined,
  city: string | null | undefined,
): CarrierBranch[] {
  const foldedState = state ? foldSearchText(state) : "";
  const foldedCity = city ? foldSearchText(city) : "";

  return getCarrierBranches(carrier)
    .filter((branch) => {
      if (foldedState && foldSearchText(branch.state) !== foldedState) {
        return false;
      }
      if (foldedCity && foldSearchText(branch.city) !== foldedCity) {
        return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        compareEs(a.city, b.city) ||
        compareEs(a.name, b.name) ||
        compareEs(a.address, b.address),
    );
}

function branchSearchHaystack(branch: CarrierBranch): string {
  return foldSearchText(
    [branch.name, branch.city, branch.state, branch.address, branch.code ?? ""].join(
      " ",
    ),
  );
}

/** Ranked national search: exact city/name hits first, then partial matches. */
export function searchCarrierBranches(
  carrier: ShippingCarrierKey,
  query: string,
  limit = 60,
  options?: {
    state?: string | null;
    city?: string | null;
  },
): CarrierBranch[] {
  const scoped = getCarrierBranchesByLocation(
    carrier,
    options?.state,
    options?.city,
  );
  const normalized = foldSearchText(query);

  if (!normalized) {
    return scoped.slice(0, limit);
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);

  const scored = scoped
    .map((branch) => {
      const haystack = branchSearchHaystack(branch);
      if (!tokens.every((token) => haystack.includes(token))) {
        return null;
      }

      let score = 0;
      const foldedName = foldSearchText(branch.name);
      const foldedCity = foldSearchText(branch.city);
      const foldedState = foldSearchText(branch.state);
      const foldedCode = foldSearchText(branch.code ?? "");

      if (foldedCode && foldedCode === normalized) score += 100;
      if (foldedCity === normalized) score += 80;
      if (foldedName === normalized) score += 70;
      if (foldedCity.startsWith(normalized)) score += 40;
      if (foldedName.startsWith(normalized)) score += 35;
      if (foldedState === normalized) score += 25;
      if (haystack.includes(normalized)) score += 15;
      score += Math.max(0, 10 - tokens.length);

      return { branch, score };
    })
    .filter((row): row is { branch: CarrierBranch; score: number } => !!row)
    .sort(
      (a, b) =>
        b.score - a.score ||
        compareEs(a.branch.city, b.branch.city) ||
        compareEs(a.branch.name, b.branch.name),
    );

  return scored.slice(0, limit).map((row) => row.branch);
}

export function formatCarrierBranchLabel(branch: CarrierBranch): string {
  const codeSuffix = branch.code && !branch.code.startsWith("x")
    ? ` (${branch.code})`
    : "";
  return `${branch.name}${codeSuffix} · ${branch.city}, ${branch.state}`;
}

export function formatCarrierBranchAddress(branch: CarrierBranch): string {
  return `${branch.address}, ${branch.city}, ${branch.state}`;
}

export function getCarrierBranchCoverage(carrier: ShippingCarrierKey): {
  offices: number;
  states: number;
  cities: number;
} {
  const branches = getCarrierBranches(carrier);
  return {
    offices: branches.length,
    states: new Set(branches.map((b) => b.state)).size,
    cities: new Set(branches.map((b) => `${b.state}|${b.city}`)).size,
  };
}
