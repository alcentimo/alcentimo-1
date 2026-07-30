import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import mrwBranchesData from "@/lib/shipping/data/mrw-branches.ve.json";

export interface CarrierBranch {
  id: string;
  carrier: ShippingCarrierKey;
  name: string;
  city: string;
  state: string;
  address: string;
  /** Official agency code when available (MRW). */
  code?: string;
}

type BranchSeed = Omit<CarrierBranch, "id" | "carrier" | "code"> & {
  code?: string;
};

type MrwBranchRecord = {
  code: string;
  name: string;
  city: string;
  state: string;
  address: string;
};

const NATIONAL_CARRIER_KEYS = [
  "mrw",
  "tealca",
  "zoom",
  "domesa",
  "libertyExpress",
] as const satisfies readonly ShippingCarrierKey[];

/** Thin national sample for carriers without a dedicated catalog yet. */
const VENEZUELA_BRANCH_SEEDS: BranchSeed[] = [
  {
    name: "Centro Caracas",
    city: "Caracas",
    state: "Distrito Capital",
    address: "Av. Urdaneta, Esquina de Altagracia",
  },
  {
    name: "Chacao",
    city: "Caracas",
    state: "Miranda",
    address: "Av. Francisco de Miranda, Centro Comercial Lido",
  },
  {
    name: "Centro Valencia",
    city: "Valencia",
    state: "Carabobo",
    address: "Av. Bolívar Norte, Sector Centro",
  },
  {
    name: "Naguanagua",
    city: "Valencia",
    state: "Carabobo",
    address: "Av. Universidad, CC Naguanagua Plaza",
  },
  {
    name: "Centro Maracaibo",
    city: "Maracaibo",
    state: "Zulia",
    address: "Av. 5 de Julio, Sector Centro",
  },
  {
    name: "Centro Barquisimeto",
    city: "Barquisimeto",
    state: "Lara",
    address: "Carrera 19 con Calle 23, Centro",
  },
  {
    name: "Maracay Centro",
    city: "Maracay",
    state: "Aragua",
    address: "Av. Las Delicias, Sector Centro",
  },
  {
    name: "Puerto Ordaz",
    city: "Ciudad Guayana",
    state: "Bolívar",
    address: "Av. Atlántico, Alta Vista",
  },
  {
    name: "San Cristóbal",
    city: "San Cristóbal",
    state: "Táchira",
    address: "Av. Ferrero Tamayo, Sector La Concordia",
  },
  {
    name: "Mérida Centro",
    city: "Mérida",
    state: "Mérida",
    address: "Av. 3 con Calle 28, Sector Centro",
  },
  {
    name: "Barcelona",
    city: "Barcelona",
    state: "Anzoátegui",
    address: "Av. 5 de Julio, Sector El Viñedo",
  },
  {
    name: "Punto Fijo",
    city: "Punto Fijo",
    state: "Falcón",
    address: "Av. José María García, Centro",
  },
  {
    name: "Cabimas",
    city: "Cabimas",
    state: "Zulia",
    address: "Av. Intercomunal, Sector Ambrosio",
  },
];

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

const MRW_BRANCHES: CarrierBranch[] = (
  mrwBranchesData as MrwBranchRecord[]
).map((row) =>
  mapSeed("mrw", {
    code: row.code,
    name: row.name,
    city: row.city,
    state: row.state,
    address: row.address,
  }),
);

const OTHER_CARRIER_BRANCHES: CarrierBranch[] = NATIONAL_CARRIER_KEYS.filter(
  (carrier) => carrier !== "mrw",
).flatMap((carrier) =>
  VENEZUELA_BRANCH_SEEDS.map((seed) => mapSeed(carrier, seed)),
);

export const CARRIER_BRANCHES: CarrierBranch[] = [
  ...MRW_BRANCHES,
  ...OTHER_CARRIER_BRANCHES,
];

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

export function searchCarrierBranches(
  carrier: ShippingCarrierKey,
  query: string,
  limit = 40,
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

  return scoped
    .filter((branch) => {
      const haystack = foldSearchText(
        [branch.name, branch.city, branch.state, branch.address, branch.code ?? ""].join(
          " ",
        ),
      );
      return haystack.includes(normalized);
    })
    .slice(0, limit);
}

export function formatCarrierBranchLabel(branch: CarrierBranch): string {
  const codeSuffix = branch.code ? ` (${branch.code})` : "";
  return `${branch.name}${codeSuffix} · ${branch.city}, ${branch.state}`;
}

export function formatCarrierBranchAddress(branch: CarrierBranch): string {
  return `${branch.address}, ${branch.city}, ${branch.state}`;
}
