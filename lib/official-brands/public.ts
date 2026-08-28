import "server-only";

import { cache } from "react";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import {
  mapOfficialBrandRow,
  toOfficialBrandPublic,
  type OfficialBrandPublic,
} from "@/lib/official-brands/types";

const SELECT =
  "id, name, slug, logo_url, logo_path, is_featured, is_active, sort_order, created_at, updated_at";

/** Marcas destacadas activas, para el carrusel global de vitrinas dropship. */
export const listFeaturedOfficialBrands = cache(
  async (): Promise<OfficialBrandPublic[]> => {
    try {
      const supabase = getPublicServerClient();
      const { data, error } = await supabase
        .from("official_brands")
        .select(SELECT)
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.warn("[official-brands]", error.message);
        return [];
      }

      return ((data as Record<string, unknown>[] | null) ?? [])
        .map(mapOfficialBrandRow)
        .filter((brand) => brand.name.length > 0)
        .map(toOfficialBrandPublic);
    } catch (caught) {
      console.warn(
        "[official-brands]",
        caught instanceof Error ? caught.message : caught,
      );
      return [];
    }
  },
);
