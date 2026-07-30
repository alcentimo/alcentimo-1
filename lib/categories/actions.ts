"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { getStoreCategoriesForManagement } from "@/lib/categories/get-store-categories";
import type { StoreCategoryRow } from "@/lib/categories/types";
import { slugify } from "@/lib/slugify";

export interface CategoryActionResult {
  error?: string;
  category?: StoreCategoryRow;
  categories?: StoreCategoryRow[];
}

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().slice(0, 80);
}

function revalidateCategoryPaths(storeSlug: string) {
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath(`/c/${storeSlug}`);
  revalidatePath(`/c/${storeSlug}/categorias`);
}

async function loadManagedCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
): Promise<StoreCategoryRow[]> {
  return getStoreCategoriesForManagement(supabase, storeId);
}

export async function listStoreCategoriesAction(): Promise<CategoryActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  try {
    const categories = await loadManagedCategories(supabase, auth.store.id);
    return { categories };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las categorías.",
    };
  }
}

export async function createStoreCategoryAction(input: {
  name: string;
}): Promise<CategoryActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const name = normalizeName(input.name);
  if (!name) return { error: "Escribe el nombre de la categoría." };

  const slug = slugify(name);
  if (!slug) return { error: "El nombre de la categoría no es válido." };

  const existing = await loadManagedCategories(supabase, auth.store.id);
  if (existing.some((row) => row.slug === slug)) {
    return { error: "Ya tienes una categoría con ese nombre." };
  }

  const nextSort =
    existing.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      store_id: auth.store.id,
      name,
      slug,
      sort_order: nextSort,
      is_active: true,
    })
    .select("id, name, slug, sort_order, is_active")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya tienes una categoría con ese nombre." };
    }
    return { error: error.message };
  }

  revalidateCategoryPaths(auth.store.slug);

  return {
    category: {
      id: data.id as string,
      name: data.name as string,
      slug: data.slug as string,
      sort_order: Number(data.sort_order ?? nextSort),
      is_active: Boolean(data.is_active),
      product_count: 0,
    },
  };
}

export async function updateStoreCategoryAction(input: {
  categoryId: string;
  name?: string;
  isActive?: boolean;
}): Promise<CategoryActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const categoryId = String(input.categoryId ?? "").trim();
  if (!categoryId) return { error: "Categoría no válida." };

  const patch: {
    name?: string;
    slug?: string;
    is_active?: boolean;
    updated_at?: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const name = normalizeName(input.name);
    if (!name) return { error: "Escribe el nombre de la categoría." };
    const slug = slugify(name);
    if (!slug) return { error: "El nombre de la categoría no es válido." };

    const siblings = await loadManagedCategories(supabase, auth.store.id);
    if (siblings.some((row) => row.slug === slug && row.id !== categoryId)) {
      return { error: "Ya tienes una categoría con ese nombre." };
    }

    patch.name = name;
    patch.slug = slug;
  }

  if (input.isActive !== undefined) {
    patch.is_active = Boolean(input.isActive);
  }

  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", categoryId)
    .eq("store_id", auth.store.id)
    .select("id, name, slug, sort_order, is_active")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya tienes una categoría con ese nombre." };
    }
    return { error: error.message };
  }
  if (!data) return { error: "No se encontró la categoría." };

  const categories = await loadManagedCategories(supabase, auth.store.id);
  const category = categories.find((row) => row.id === categoryId);
  revalidateCategoryPaths(auth.store.slug);

  return {
    category: category ?? {
      id: data.id as string,
      name: data.name as string,
      slug: data.slug as string,
      sort_order: Number(data.sort_order ?? 0),
      is_active: Boolean(data.is_active),
      product_count: 0,
    },
  };
}

export async function reorderStoreCategoriesAction(input: {
  orderedIds: string[];
}): Promise<CategoryActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const orderedIds = (input.orderedIds ?? [])
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);

  if (orderedIds.length === 0) {
    return { error: "No hay categorías para reordenar." };
  }

  const existing = await loadManagedCategories(supabase, auth.store.id);
  const existingIds = new Set(existing.map((row) => row.id));
  if (
    orderedIds.length !== existing.length ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { error: "La lista de categorías no es válida." };
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("categories")
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("store_id", auth.store.id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) return { error: failed.error.message };

  const categories = await loadManagedCategories(supabase, auth.store.id);
  revalidateCategoryPaths(auth.store.slug);
  return { categories };
}

export async function deleteStoreCategoryAction(input: {
  categoryId: string;
}): Promise<CategoryActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const categoryId = String(input.categoryId ?? "").trim();
  if (!categoryId) return { error: "Categoría no válida." };

  const categories = await loadManagedCategories(supabase, auth.store.id);
  const target = categories.find((row) => row.id === categoryId);
  if (!target) return { error: "No se encontró la categoría." };

  if (target.product_count > 0) {
    return {
      error: `No puedes eliminar "${target.name}" porque tiene ${target.product_count} producto${target.product_count === 1 ? "" : "s"}. Reasigna o desactiva la categoría.`,
    };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  revalidateCategoryPaths(auth.store.slug);
  return {
    categories: categories.filter((row) => row.id !== categoryId),
  };
}
