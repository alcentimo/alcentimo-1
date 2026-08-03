-- ============================================================
-- Checkout: no remaper siempre a la variante default (Base).
--
-- Papelería unificada envía inventory_variant_id explícito en el
-- ítem JSON. Ropa/moda y demás variantes deben descontar el UUID
-- de la línea (ej. "Talla M / Color Negro"), no el Base con stock 0.
--
-- Antes: order_item_inventory_variant_id(p_variant_id) → default
-- → "Stock insuficiente en la sucursal (disponible: 0, solicitado: 1)"
-- aunque la combinación sí tuviera stock en product_variants /
-- variant_location_stock.
-- ============================================================

CREATE OR REPLACE FUNCTION public.order_item_inventory_variant_id(
  p_variant_id UUID,
  p_item JSONB
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_explicit UUID;
BEGIN
  -- Solo papelería (unified_stock) / casos que lo setean en el JSON.
  v_explicit := NULLIF(trim(p_item->>'inventory_variant_id'), '')::UUID;
  IF v_explicit IS NOT NULL THEN
    RETURN v_explicit;
  END IF;

  RETURN p_variant_id;
END;
$$;

COMMENT ON FUNCTION public.order_item_inventory_variant_id(UUID, JSONB) IS
  'Resuelve la variante de inventario del ítem: inventory_variant_id explícito (papelería) o el variant_id de la línea.';
