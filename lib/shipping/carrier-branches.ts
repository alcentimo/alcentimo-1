import type { ShippingCarrierKey } from "@/lib/store-settings/types";

export interface CarrierBranch {
  id: string;
  carrier: ShippingCarrierKey;
  name: string;
  city: string;
  state: string;
  address: string;
}

type BranchSeed = Omit<CarrierBranch, "id" | "carrier">;

const NATIONAL_CARRIER_KEYS = [
  "mrw",
  "tealca",
  "zoom",
  "domesa",
  "libertyExpress",
] as const satisfies readonly ShippingCarrierKey[];

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
    name: "La Candelaria",
    city: "Caracas",
    state: "Distrito Capital",
    address: "Av. México, Edificio Centro Plaza",
  },
  {
    name: "El Marques",
    city: "Caracas",
    state: "Miranda",
    address: "Av. Intercomunal El Marques, CC El Marques",
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
    name: "Lago Mall",
    city: "Maracaibo",
    state: "Zulia",
    address: "Av. El Milagro, CC Lago Mall",
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

function buildBranchId(carrier: ShippingCarrierKey, seed: BranchSeed): string {
  return `${carrier}-${slugify(seed.city)}-${slugify(seed.name)}`;
}

export const CARRIER_BRANCHES: CarrierBranch[] = NATIONAL_CARRIER_KEYS.flatMap(
  (carrier) =>
    VENEZUELA_BRANCH_SEEDS.map((seed) => ({
      id: buildBranchId(carrier, seed),
      carrier,
      ...seed,
    })),
);

const BRANCHES_BY_ID = new Map(
  CARRIER_BRANCHES.map((branch) => [branch.id, branch]),
);

export function getCarrierBranches(
  carrier: ShippingCarrierKey,
): CarrierBranch[] {
  return CARRIER_BRANCHES.filter((branch) => branch.carrier === carrier);
}

export function getCarrierBranchById(
  branchId: string | null | undefined,
): CarrierBranch | null {
  if (!branchId?.trim()) return null;
  return BRANCHES_BY_ID.get(branchId.trim()) ?? null;
}

export function searchCarrierBranches(
  carrier: ShippingCarrierKey,
  query: string,
  limit = 25,
): CarrierBranch[] {
  const normalized = query.trim().toLowerCase();
  const branches = getCarrierBranches(carrier);

  if (!normalized) {
    return branches.slice(0, limit);
  }

  return branches
    .filter((branch) => {
      const haystack = [
        branch.name,
        branch.city,
        branch.state,
        branch.address,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, limit);
}

export function formatCarrierBranchLabel(branch: CarrierBranch): string {
  return `${branch.name} · ${branch.city}, ${branch.state}`;
}

export function formatCarrierBranchAddress(branch: CarrierBranch): string {
  return `${branch.address}, ${branch.city}, ${branch.state}`;
}
