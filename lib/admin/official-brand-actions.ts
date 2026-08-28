"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { MERCADO_CATALOG_CACHE_TAG } from "@/lib/mercado-oculto/catalog-cache";
import { revalidateAllPublicCatalogCaches } from "@/lib/catalog/public-catalog-cache";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { normalizeProductBrand } from "@/lib/catalog/product-brand";
import {
  mapOfficialBrandRow,
  type OfficialBrand,
} from "@/lib/official-brands/types";
import {
  removeOfficialBrandLogo,
  uploadOfficialBrandLogo,
} from "@/lib/official-brands/storage";
import { syncOfficialBrandNameToLinkedProducts } from "@/lib/official-brands/sync-linked-products";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

const SELECT =
  "id, name, slug, logo_url, logo_path, is_featured, is_active, sort_order, created_at, updated_at";

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso de administrador." };
  }
  return { ok: true as const, user };
}

function bustBrandCaches() {
  revalidateTag(MERCADO_CATALOG_CACHE_TAG, "max");
  revalidatePath("/admin/dashboard");
  revalidateAllPublicCatalogCaches();
}

function parseSortOrder(raw: FormDataEntryValue | null): number {
  const value = Number(String(raw ?? "0").trim());
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(9999, Math.round(value)));
}

export async function listAdminOfficialBrands(): Promise<
  ActionResult<{ brands: OfficialBrand[] }>
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("official_brands")
    .select(SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { error: error.message };

  return {
    brands: ((data as Record<string, unknown>[] | null) ?? []).map(
      mapOfficialBrandRow,
    ),
  };
}

export async function createOfficialBrand(
  formData: FormData,
): Promise<ActionResult<{ brand: OfficialBrand }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const name = normalizeProductBrand(String(formData.get("name") ?? ""));
  if (!name) return { error: "Indica el nombre de la marca." };

  const featuredRaw = String(formData.get("is_featured") ?? "true");
  const isFeatured = featuredRaw !== "false" && featuredRaw !== "0";
  const sortOrder = parseSortOrder(formData.get("sort_order"));
  const logo = formData.get("logo");
  const logoFile = logo instanceof File && logo.size > 0 ? logo : null;

  const admin = createAdminClient();
  const slugBase = slugify(name) || "marca";
  let slug = slugBase;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    slug = attempt === 0 ? slugBase : uniqueSlug(slugBase, `${Date.now()}`);
    const { data, error } = await admin
      .from("official_brands")
      .insert({
        name,
        slug,
        is_featured: isFeatured,
        is_active: true,
        sort_order: sortOrder,
      })
      .select(SELECT)
      .single();

    if (error) {
      if (error.code === "23505" && attempt < 5) continue;
      return { error: error.message };
    }

    let brand = mapOfficialBrandRow(data as Record<string, unknown>);
    if (logoFile) {
      const uploaded = await uploadOfficialBrandLogo({
        client: admin,
        brandId: brand.id,
        file: logoFile,
      });
      if (uploaded.error) {
        return { error: uploaded.error, brand };
      }
      const { data: patched, error: patchError } = await admin
        .from("official_brands")
        .update({
          logo_url: uploaded.url ?? null,
          logo_path: uploaded.path ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brand.id)
        .select(SELECT)
        .single();
      if (patchError) return { error: patchError.message, brand };
      brand = mapOfficialBrandRow(patched as Record<string, unknown>);
    }

    bustBrandCaches();
    return { brand };
  }

  return { error: "No se pudo crear la marca." };
}

export async function updateOfficialBrand(
  brandId: string,
  formData: FormData,
): Promise<ActionResult<{ brand: OfficialBrand }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const id = brandId.trim();
  if (!id) return { error: "Marca inválida." };

  const name = normalizeProductBrand(String(formData.get("name") ?? ""));
  if (!name) return { error: "Indica el nombre de la marca." };

  const featuredRaw = String(formData.get("is_featured") ?? "true");
  const isFeatured = featuredRaw !== "false" && featuredRaw !== "0";
  const sortOrder = parseSortOrder(formData.get("sort_order"));
  const logo = formData.get("logo");
  const logoFile = logo instanceof File && logo.size > 0 ? logo : null;

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("official_brands")
    .select(SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: "Marca no encontrada." };

  const current = mapOfficialBrandRow(existing as Record<string, unknown>);
  let logoUrl = current.logoUrl;
  let logoPath = current.logoPath;

  if (logoFile) {
    const uploaded = await uploadOfficialBrandLogo({
      client: admin,
      brandId: id,
      file: logoFile,
    });
    if (uploaded.error) return { error: uploaded.error };
    logoUrl = uploaded.url ?? logoUrl;
    logoPath = uploaded.path ?? logoPath;
  }

  const patch: Record<string, unknown> = {
    name,
    is_featured: isFeatured,
    sort_order: sortOrder,
    logo_url: logoUrl,
    logo_path: logoPath,
    updated_at: new Date().toISOString(),
  };

  if (name !== current.name) {
    const slugBase = slugify(name) || current.slug;
    if (slugBase !== current.slug) {
      patch.slug = slugBase;
    }
  }

  const { data, error } = await admin
    .from("official_brands")
    .update(patch)
    .eq("id", id)
    .select(SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      patch.slug = uniqueSlug(slugify(name) || "marca", id.slice(0, 8));
      const retry = await admin
        .from("official_brands")
        .update(patch)
        .eq("id", id)
        .select(SELECT)
        .maybeSingle();
      if (retry.error || !retry.data) {
        return { error: retry.error?.message ?? "No se pudo guardar la marca." };
      }
      const brand = mapOfficialBrandRow(retry.data as Record<string, unknown>);
      if (name !== current.name) {
        await propagateOfficialBrandRename(admin, id, name);
      }
      bustBrandCaches();
      return { brand };
    }
    return { error: error.message };
  }
  if (!data) return { error: "Marca no encontrada." };

  const brand = mapOfficialBrandRow(data as Record<string, unknown>);
  if (name !== current.name) {
    await propagateOfficialBrandRename(admin, id, name);
  }
  bustBrandCaches();
  return { brand };
}

async function propagateOfficialBrandRename(
  admin: ReturnType<typeof createAdminClient>,
  brandId: string,
  name: string,
) {
  const { data: products } = await admin
    .from("supplier_products")
    .select("id")
    .eq("official_brand_id", brandId)
    .eq("is_active", true);

  await admin
    .from("supplier_products")
    .update({ brand: name, updated_at: new Date().toISOString() })
    .eq("official_brand_id", brandId);

  for (const row of (products as Array<{ id?: string }> | null) ?? []) {
    if (typeof row.id !== "string") continue;
    await syncOfficialBrandNameToLinkedProducts(admin, row.id, name);
  }
}

export async function archiveOfficialBrand(
  brandId: string,
): Promise<ActionResult<{ ok: true }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const id = brandId.trim();
  if (!id) return { error: "Marca inválida." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("official_brands")
    .select("id, logo_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin
    .from("official_brands")
    .update({
      is_active: false,
      is_featured: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  const { data: products } = await admin
    .from("supplier_products")
    .select("id")
    .eq("official_brand_id", id);

  await admin
    .from("supplier_products")
    .update({
      official_brand_id: null,
      brand: null,
      updated_at: new Date().toISOString(),
    })
    .eq("official_brand_id", id);

  for (const row of (products as Array<{ id?: string }> | null) ?? []) {
    if (typeof row.id !== "string") continue;
    await syncOfficialBrandNameToLinkedProducts(admin, row.id, null);
  }

  const path =
    existing && typeof existing.logo_path === "string"
      ? existing.logo_path
      : null;
  await removeOfficialBrandLogo({ client: admin, path });

  bustBrandCaches();
  return { ok: true };
}

export async function assignSupplierProductOfficialBrand(input: {
  supplierProductId: string;
  officialBrandId: string | null;
}): Promise<ActionResult<{ ok: true; brandName: string | null }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const productId = input.supplierProductId.trim();
  if (!productId) return { error: "Producto inválido." };

  const admin = createAdminClient();
  let brandName: string | null = null;
  const brandId = input.officialBrandId?.trim() || null;

  if (brandId) {
    const { data: brand, error } = await admin
      .from("official_brands")
      .select("id, name")
      .eq("id", brandId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!brand) return { error: "Marca no encontrada." };
    brandName = normalizeProductBrand(String(brand.name ?? ""));
  }

  const { error: updateError } = await admin
    .from("supplier_products")
    .update({
      official_brand_id: brandId,
      brand: brandName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("is_active", true);

  if (updateError) return { error: updateError.message };

  await syncOfficialBrandNameToLinkedProducts(admin, productId, brandName);
  bustBrandCaches();
  return { ok: true, brandName };
}
