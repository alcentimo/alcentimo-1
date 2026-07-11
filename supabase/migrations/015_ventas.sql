-- ============================================================
-- alcentimo-1 — Registro multicanal de ventas
-- Ejecutar DESPUÉS de 002_stores_multi_tenancy.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ventas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  usuario_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  producto_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id         UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  cantidad           INTEGER NOT NULL CHECK (cantidad > 0),
  monto              NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  metodo_pago        TEXT NOT NULL,
  canal_venta        TEXT NOT NULL,
  external_reference TEXT,
  notas              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_store_created
  ON public.ventas (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_producto
  ON public.ventas (producto_id);

CREATE INDEX IF NOT EXISTS idx_ventas_canal
  ON public.ventas (store_id, canal_venta);

CREATE INDEX IF NOT EXISTS idx_ventas_external_ref
  ON public.ventas (external_reference)
  WHERE external_reference IS NOT NULL;

COMMENT ON TABLE public.ventas IS
  'Registro de ventas multicanal. Integraciones (ML, Meta) insertan con canal_venta correspondiente.';
COMMENT ON COLUMN public.ventas.canal_venta IS
  'Ej: Mercado Libre, Instagram, Facebook, WhatsApp, Tienda Fisica, Otro';
COMMENT ON COLUMN public.ventas.metodo_pago IS
  'Ej: Efectivo, Transferencia, Pago Movil, Divisa, Zelle, Otro';
COMMENT ON COLUMN public.ventas.external_reference IS
  'ID externo (orden ML, pedido webhook) para sincronización automática futura';

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_member_select ON public.ventas;
CREATE POLICY ventas_member_select
  ON public.ventas FOR SELECT
  TO authenticated
  USING (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS ventas_member_insert ON public.ventas;
CREATE POLICY ventas_member_insert
  ON public.ventas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_member_of_store(store_id)
    AND usuario_id = auth.uid()
  );

DROP POLICY IF EXISTS ventas_member_update ON public.ventas;
CREATE POLICY ventas_member_update
  ON public.ventas FOR UPDATE
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS ventas_member_delete ON public.ventas;
CREATE POLICY ventas_member_delete
  ON public.ventas FOR DELETE
  TO authenticated
  USING (public.is_member_of_store(store_id));
