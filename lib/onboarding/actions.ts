"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { userHasStore } from "@/lib/stores";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { STORE_CATEGORY_OPTIONS } from "@/lib/onboarding/categories";

export type OnboardingFormState = {
  error?: string;
};

async function resolveUniqueStoreSlug(
  supabase: SupabaseClient,
  baseName: string,
): Promise<string> {
  let slug = slugify(baseName) || "mi-tienda";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? slug : uniqueSlug(baseName, crypto.randomUUID());
    const { data: taken } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!taken) return candidate;
    slug = candidate;
  }

  return uniqueSlug(baseName, crypto.randomUUID());
}

export async function completeOnboarding(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  if (await userHasStore(supabase, auth.authUser.id)) {
    redirect("/dashboard");
  }

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const customCategory = String(formData.get("custom_category") ?? "").trim();

  if (!name) {
    return { error: "El nombre de la tienda es obligatorio." };
  }

  if (!category) {
    return { error: "Selecciona una categoría para tu negocio." };
  }

  const categoryName =
    category === "Otros"
      ? customCategory
      : category;

  if (!categoryName.trim()) {
    return { error: "Indica la categoría de tu negocio." };
  }

  if (
    category !== "Otros" &&
    !STORE_CATEGORY_OPTIONS.includes(category as (typeof STORE_CATEGORY_OPTIONS)[number])
  ) {
    return { error: "Categoría no válida." };
  }

  const slug = await resolveUniqueStoreSlug(supabase, name);
  const categorySlug = slugify(categoryName) || "general";

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      owner_id: auth.authUser.id,
      name,
      slug,
    })
    .select("id")
    .single();

  if (storeError) {
    if (storeError.code === "23505") {
      return { error: "Ese nombre de tienda ya está en uso. Prueba con otro." };
    }
    return { error: storeError.message };
  }

  const { error: categoryError } = await supabase.from("categories").insert({
    store_id: store.id,
    name: categoryName.trim(),
    slug: categorySlug,
  });

  if (categoryError) {
    return { error: categoryError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  redirect("/dashboard");
}
