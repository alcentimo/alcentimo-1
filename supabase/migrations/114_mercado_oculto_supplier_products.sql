-- Mercado oculto: conversaciones sobre productos mayoristas (supplier_products).

ALTER TABLE public.mercado_conversations
  ADD COLUMN IF NOT EXISTS supplier_product_id UUID
    REFERENCES public.supplier_products (id) ON DELETE CASCADE;

ALTER TABLE public.mercado_conversations
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.mercado_conversations
  ALTER COLUMN store_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mercado_conversations_supplier_product_buyer_uidx
  ON public.mercado_conversations (supplier_product_id, buyer_user_id)
  WHERE supplier_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mercado_conversations_supplier_product_idx
  ON public.mercado_conversations (supplier_product_id)
  WHERE supplier_product_id IS NOT NULL;

COMMENT ON COLUMN public.mercado_conversations.supplier_product_id IS
  'Producto del catálogo mayorista oficial mostrado en /mercado-oculto.';
