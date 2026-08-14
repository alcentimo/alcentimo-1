-- Mercado oculto: directorio de productos de suscriptores + chat de negociación.
-- Aislado del catálogo público y del checkout; sin pasarela ni carrito.

CREATE TABLE IF NOT EXISTS public.mercado_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mercado_conversations_buyer_ne_seller
    CHECK (buyer_user_id <> seller_user_id),
  CONSTRAINT mercado_conversations_product_buyer_uidx
    UNIQUE (product_id, buyer_user_id)
);

CREATE TABLE IF NOT EXISTS public.mercado_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL
    REFERENCES public.mercado_conversations (id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mercado_messages_body_len
    CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 4000)
);

CREATE INDEX IF NOT EXISTS mercado_conversations_buyer_updated_idx
  ON public.mercado_conversations (buyer_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS mercado_conversations_seller_updated_idx
  ON public.mercado_conversations (seller_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS mercado_conversations_product_idx
  ON public.mercado_conversations (product_id);

CREATE INDEX IF NOT EXISTS mercado_messages_conversation_created_idx
  ON public.mercado_messages (conversation_id, created_at ASC);

COMMENT ON TABLE public.mercado_conversations IS
  'Chats de negociación del mercado oculto (sin pagos ni carrito en plataforma).';
COMMENT ON TABLE public.mercado_messages IS
  'Mensajes del chat interno del mercado oculto.';

ALTER TABLE public.mercado_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_messages ENABLE ROW LEVEL SECURITY;
