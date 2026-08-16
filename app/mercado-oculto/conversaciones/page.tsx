import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildMercadoLoginHref } from "@/lib/mercado-oculto/access";
import { listMyMercadoConversations } from "@/lib/mercado-oculto/chat-actions";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MercadoConversacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildMercadoLoginHref("/mercado-oculto/conversaciones"));
  }

  const listed = await listMyMercadoConversations();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="mercado-section-label">Pedidos Moriche</p>
        <h1 className="mercado-heading">Mis compras y chats</h1>
        <p className="mercado-subheading">
          Negociación y seguimiento de pedidos en la vitrina Moriche.
        </p>
      </header>

      {listed.error ? (
        <p className="mercado-alert" role="alert">
          {listed.error}
        </p>
      ) : (listed.conversations ?? []).length === 0 ? (
        <div className="mercado-empty">
          <p>Aún no tenés conversaciones.</p>
          <Link href="/mercado-oculto" className="mercado-back-link mt-3 inline-flex">
            Explorar el catálogo
          </Link>
        </div>
      ) : (
        <ul className="mercado-chat-list">
          {(listed.conversations ?? []).map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={
                  conversation.productId
                    ? `/mercado-oculto/producto/${conversation.productId}?c=${conversation.id}`
                    : "/mercado-oculto"
                }
                className="mercado-chat-list-item"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--mo-ink)]">
                    {conversation.productName ?? "Producto Moriche"}
                  </p>
                  <p className="truncate text-xs text-[var(--mo-muted)]">
                    {conversation.storeName ?? "Moriche"} ·{" "}
                    {conversation.role === "seller" ? "Vendedor" : "Comprador"}
                  </p>
                  {conversation.lastMessagePreview ? (
                    <p className="mt-1 line-clamp-1 text-xs text-[var(--mo-muted)]">
                      {conversation.lastMessagePreview}
                    </p>
                  ) : null}
                </div>
                <time className="shrink-0 text-[11px] text-[var(--mo-muted)]">
                  {formatDate(conversation.updatedAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
