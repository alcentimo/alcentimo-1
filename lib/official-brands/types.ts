export type OfficialBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoPath: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type OfficialBrandPublic = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export function mapOfficialBrandRow(row: Record<string, unknown>): OfficialBrand {
  return {
    id: String(row.id),
    name: String(row.name ?? "").trim(),
    slug: String(row.slug ?? "").trim(),
    logoUrl:
      typeof row.logo_url === "string" && row.logo_url.trim()
        ? row.logo_url.trim()
        : null,
    logoPath:
      typeof row.logo_path === "string" && row.logo_path.trim()
        ? row.logo_path.trim()
        : null,
    isFeatured: row.is_featured !== false,
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function toOfficialBrandPublic(brand: OfficialBrand): OfficialBrandPublic {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
  };
}
