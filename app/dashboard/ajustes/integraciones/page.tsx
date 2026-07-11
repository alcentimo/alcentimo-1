import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreIntegrations } from "@/lib/inbox/get-store-integrations";
import { IntegrationsTab } from "@/components/dashboard/settings/IntegrationsTab";
import { getChannelIntegration } from "@/src/config/channel-integrations";
import type { ChannelProviderKey } from "@/src/config/channel-integrations";

export const dynamic = "force-dynamic";

const VALID_CHANNELS = new Set<ChannelProviderKey>([
  "whatsapp",
  "instagram",
  "messenger",
  "mercadolibre",
]);

function resolveStatus(searchParams: {
  connected?: string;
  error?: string;
}): { message: string | null; tone: "success" | "error" | null } {
  if (searchParams.connected && VALID_CHANNELS.has(searchParams.connected as ChannelProviderKey)) {
    const channel = getChannelIntegration(searchParams.connected as ChannelProviderKey);
    return {
      message: `${channel.label} conectado correctamente. Ya puedes recibir mensajes en tu bandeja.`,
      tone: "success",
    };
  }

  switch (searchParams.error) {
    case "meta_not_configured":
      return {
        message:
          "Meta aún no está configurado en el servidor. Añade META_APP_ID y META_APP_SECRET en Vercel.",
        tone: "error",
      };
    case "ml_not_configured":
      return {
        message:
          "MercadoLibre aún no está configurado en el servidor. Añade ML_APP_ID y ML_APP_SECRET en Vercel.",
        tone: "error",
      };
    case "oauth_denied":
      return {
        message: "Autorización cancelada. Puedes intentarlo de nuevo cuando quieras.",
        tone: "error",
      };
    case "connect_failed":
      return {
        message:
          "No se pudo completar la conexión con Meta. Verifica tu app de Meta Business e inténtalo otra vez.",
        tone: "error",
      };
    case "ml_connect_failed":
      return {
        message:
          "No se pudo completar la conexión con MercadoLibre. Verifica tu app en el panel de desarrolladores e inténtalo otra vez.",
        tone: "error",
      };
    case "invalid_provider":
    case "invalid_state":
      return {
        message: "La solicitud de conexión no es válida. Vuelve a intentarlo.",
        tone: "error",
      };
    default:
      return { message: null, tone: null };
  }
}

export default async function IntegracionesPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; connected?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/ajustes/integraciones");
  }

  const { store } = session;
  const params = await searchParams;
  const focusChannel =
    params.channel && VALID_CHANNELS.has(params.channel as ChannelProviderKey)
      ? (params.channel as ChannelProviderKey)
      : null;
  const status = resolveStatus(params);

  let integrations: Awaited<ReturnType<typeof getStoreIntegrations>> = [];

  if (store) {
    integrations = await getStoreIntegrations(supabase, store.id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="page-header">
        <Link
          href="/dashboard/ajustes"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a ajustes
        </Link>
        <p className="section-label">Configuración</p>
        <h1 className="page-header-title">Integraciones</h1>
        <p className="page-header-desc">
          Conecta WhatsApp, Instagram, Facebook y MercadoLibre para centralizar
          tus mensajes y ventas
          {store ? ` · ${store.name}` : ""}.
        </p>
      </header>

      {!store ? (
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      ) : (
        <div className="settings-workspace">
          <div className="settings-workspace-body">
            <IntegrationsTab
              integrations={integrations}
              focusChannel={focusChannel}
              statusMessage={status.message}
              statusTone={status.tone}
            />
          </div>
        </div>
      )}
    </div>
  );
}
