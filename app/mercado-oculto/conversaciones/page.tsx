import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import {
  hasMercadoOcultoSubscription,
  resolveMercadoOcultoDenial,
} from "@/lib/mercado-oculto/access";
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
  const authUser = await getAuthUserWithPlan(supabase);

  if (!authUser) {
    redirect("/dashboard/login?next=/mercado-oculto/conversaciones");
  }

  const denial = resolveMercadoOcultoDenial(authUser.profile, true);
  if (denial || !hasMercadoOcultoSubscription(authUser.profile)) {
    redirect("/dashboard/planes?mercado_denied=1");
  }

  const listed = await listMyMercadoConversations();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="mercado-section-label">Negociación</p>
        <h1 className="mercado-heading">Tus chats</h1>
        <p className="mercado-subheading">
          Conversaciones como interesado o como dueño de tienda. Sin pagos ni
          carrito en la plataforma.
        </p>
      </header>

      {listed.error ? (
        <p className="mercado-alert" role="alert">
          {listed.error}
        </p>
      ) : null}

      {(listed.conversations ?? []).length === 0 && !listed.error ? (
        <p className="mercado-empty">
          Todavía no tienes chats. Abre un producto en la{" "}
          <Link href="/mercado-oculto" className="font-medium underline">
            vitrina
          </Link>{" "}
          para iniciar una negociación.
        </p>
      ) : (
        <ul className="mercado-chat-list">
          {(listed.conversations ?? []).map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/mercado-oculto/producto/${conversation.productId}?c=${conversation.id}`}
                className="mercado-chat-list-item"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {conversation.productName ?? "Producto"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {conversation.storeName ?? "Tienda"} ·{" "}
                    {conversation.role === "seller" ? "Tu producto" : "Interesado"}
                  </p>
                  {conversation.lastMessagePreview ? (
                    <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
                      {conversation.lastMessagePreview}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-400">Sin mensajes aún</p>
                  )}
                </div>
                <time className="shrink-0 text-[11px] text-zinc-400">
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
