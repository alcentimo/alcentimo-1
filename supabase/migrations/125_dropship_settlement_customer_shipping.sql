-- Snapshot del destinatario final en cada línea de liquidación dropship.
-- Así Alcéntimo puede armar la guía aunque el pedido del catálogo cambie o se borre.

ALTER TABLE public.dropship_daily_settlement_lines
  ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT,
  ADD COLUMN IF NOT EXISTS shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS shipping_branch_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_branch_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

COMMENT ON COLUMN public.dropship_daily_settlement_lines.customer_name IS
  'Nombre del cliente final (snapshot al reportar el pago consolidado).';
COMMENT ON COLUMN public.dropship_daily_settlement_lines.customer_phone IS
  'Teléfono del cliente final para la guía de despacho.';
COMMENT ON COLUMN public.dropship_daily_settlement_lines.fulfillment_type IS
  'Tipo de cumplimiento del pedido de catálogo: delivery, pickup o shipping.';
COMMENT ON COLUMN public.dropship_daily_settlement_lines.shipping_method IS
  'Método/encomienda del cliente final (mrw, zoom, delivery, etc.).';
COMMENT ON COLUMN public.dropship_daily_settlement_lines.shipping_branch_name IS
  'Sucursal de encomienda destino (MRW/Zoom/etc.).';
COMMENT ON COLUMN public.dropship_daily_settlement_lines.shipping_branch_address IS
  'Dirección de la sucursal de encomienda destino.';
COMMENT ON COLUMN public.dropship_daily_settlement_lines.delivery_address IS
  'Dirección o punto de entrega del cliente final.';
