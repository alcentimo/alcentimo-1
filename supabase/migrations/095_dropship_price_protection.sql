-- Dropshipping: historial de precios mayoristas, vínculos tienda↔ proveedor,
-- alertas de cambio de costo y snapshot inmutable en líneas de pedido.

-- ── 1. Historial de precios del mayorista ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.supplier_product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products (id) ON DELETE CASCADE,
  old_price_usd NUMERIC(12, 2),
  new_price_usd NUMERIC(12, 2) NOT NULL CHECK (new_price_usd >= 0),
  changed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_product_price_history_product_idx
  ON public.supplier_product_price_history (supplier_product_id, created_at DESC);

COMMENT ON TABLE public.supplier_product_price_history IS
  'Historial de cambios de precio base de productos mayoristas.';

ALTER TABLE public.supplier_product_price_history ENABLE ROW LEVEL SECURITY;

-- ── 2. Snapshot de costo inmutable en pedidos B2B ───────────────────────────

ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS unit_cost_usd NUMERIC(12, 2);

ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS cost_locked_at TIMESTAMPTZ;

-- Backfill: el precio unitario histórico es el costo congelado.
UPDATE public.supplier_order_items
SET
  unit_cost_usd = COALESCE(unit_cost_usd, unit_price_usd),
  cost_locked_at = COALESCE(cost_locked_at, created_at)
WHERE unit_cost_usd IS NULL OR cost_locked_at IS NULL;

ALTER TABLE public.supplier_order_items
  ALTER COLUMN unit_cost_usd SET NOT NULL;

ALTER TABLE public.supplier_order_items
  ALTER COLUMN cost_locked_at SET NOT NULL;

ALTER TABLE public.supplier_order_items
  ALTER COLUMN cost_locked_at SET DEFAULT now();

COMMENT ON COLUMN public.supplier_order_items.unit_price_usd IS
  'Precio cobrado al comerciante (snapshot). No debe mutar tras crear la línea.';
COMMENT ON COLUMN public.supplier_order_items.unit_cost_usd IS
  'Costo mayorista congelado al emitir/iniciar el pedido. Inmutable.';
COMMENT ON COLUMN public.supplier_order_items.cost_locked_at IS
  'Momento en que se congeló el costo de la línea.';

CREATE OR REPLACE FUNCTION public.prevent_supplier_order_item_cost_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.unit_price_usd IS DISTINCT FROM OLD.unit_price_usd
       OR NEW.unit_cost_usd IS DISTINCT FROM OLD.unit_cost_usd
       OR NEW.line_total_usd IS DISTINCT FROM OLD.line_total_usd
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.product_title IS DISTINCT FROM OLD.product_title THEN
      RAISE EXCEPTION
        'Los costos y precios de líneas de pedido de proveedor son inmutables (protección dropshipping).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_order_items_immutable_cost
  ON public.supplier_order_items;
CREATE TRIGGER supplier_order_items_immutable_cost
  BEFORE UPDATE ON public.supplier_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_supplier_order_item_cost_mutation();

-- ── 3. Vínculo producto de tienda ↔ producto mayorista ──────────────────────

CREATE TABLE IF NOT EXISTS public.store_dropship_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products (id) ON DELETE CASCADE,
  -- Si true, al cambiar el costo se intenta aplicar el precio sugerido al catálogo.
  auto_reprice BOOLEAN NOT NULL DEFAULT false,
  -- Costo mayorista observado la última vez (para mostrar delta).
  last_cost_usd NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_dropship_links_product_unique UNIQUE (product_id),
  CONSTRAINT store_dropship_links_store_supplier_unique UNIQUE (store_id, supplier_product_id)
);

CREATE INDEX IF NOT EXISTS store_dropship_links_store_idx
  ON public.store_dropship_links (store_id);

CREATE INDEX IF NOT EXISTS store_dropship_links_supplier_product_idx
  ON public.store_dropship_links (supplier_product_id);

COMMENT ON TABLE public.store_dropship_links IS
  'Relación dropshipping: producto del comerciante abastecido por un SKU mayorista.';

ALTER TABLE public.store_dropship_links ENABLE ROW LEVEL SECURITY;

-- ── 4. Alertas de cambio de costo para comerciantes ─────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supplier_price_alert_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.supplier_price_alert_status AS ENUM (
      'unread',
      'read',
      'applied',
      'dismissed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.supplier_price_change_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products (id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  dropship_link_id UUID REFERENCES public.store_dropship_links (id) ON DELETE SET NULL,
  supplier_product_title TEXT NOT NULL DEFAULT '',
  old_cost_usd NUMERIC(12, 2) NOT NULL,
  new_cost_usd NUMERIC(12, 2) NOT NULL,
  suggested_retail_usd NUMERIC(12, 2),
  previous_retail_usd NUMERIC(12, 2),
  status public.supplier_price_alert_status NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS supplier_price_change_alerts_store_status_idx
  ON public.supplier_price_change_alerts (store_id, status, created_at DESC);

COMMENT ON TABLE public.supplier_price_change_alerts IS
  'Avisos al comerciante cuando el mayorista cambia el costo de un producto vinculado.';

ALTER TABLE public.supplier_price_change_alerts ENABLE ROW LEVEL SECURITY;

-- ── 5. Semilla de historial para productos existentes ───────────────────────

INSERT INTO public.supplier_product_price_history (
  supplier_product_id,
  old_price_usd,
  new_price_usd,
  note
)
SELECT
  sp.id,
  NULL,
  sp.base_price_usd,
  'Precio inicial registrado (migración 095).'
FROM public.supplier_products sp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.supplier_product_price_history h
  WHERE h.supplier_product_id = sp.id
);
