import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { AcceptInvitationPanel } from "@/components/dashboard/team/AcceptInvitationPanel";
import { previewStoreInvitationAction } from "@/lib/team/actions";
import { INVITABLE_ROLE_LABELS } from "@/lib/team/roles";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default async function InvitacionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const trimmedToken = token?.trim() ?? "";

  if (!trimmedToken) {
    redirect("/dashboard/login");
  }

  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    redirect(
      `/dashboard/login?next=${encodeURIComponent(`/dashboard/invitacion?token=${encodeURIComponent(trimmedToken)}`)}`,
    );
  }

  const previewResult = await previewStoreInvitationAction(trimmedToken);
  const preview = previewResult.preview;

  return (
    <main className="page-shell-auth min-h-dvh safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />
      <PageContainer className="relative py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo href="/dashboard/catalogo" />
          <Link
            href="/dashboard/catalogo"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al panel
          </Link>
        </div>

        <header className="page-header mb-6 max-w-xl">
          <p className="section-label">Equipo</p>
          <h1 className="page-header-title">Unirse a una tienda</h1>
          <p className="page-header-desc">
            Acepta la invitación para colaborar en el panel de administración.
          </p>
        </header>

        <div className="max-w-xl">
          {previewResult.error || !preview ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {previewResult.error ?? "Invitación no encontrada."}
            </div>
          ) : preview.isRevoked ? (
            <StatusCard
              title="Invitación revocada"
              description="El administrador canceló esta invitación. Pide una nueva si aún necesitas acceso."
            />
          ) : preview.isAccepted ? (
            <StatusCard
              title="Invitación ya usada"
              description="Este enlace ya fue aceptado. Inicia sesión con tu cuenta para entrar al panel."
              actionHref="/dashboard/catalogo"
              actionLabel="Ir al panel"
            />
          ) : preview.isExpired ? (
            <StatusCard
              title="Invitación expirada"
              description="Este enlace venció. Pide al dueño de la tienda que te envíe una nueva invitación."
            />
          ) : (
            <AcceptInvitationPanel
              token={trimmedToken}
              storeName={preview.storeName}
              roleLabel={INVITABLE_ROLE_LABELS[preview.role]}
              invitedEmail={preview.email}
              userEmail={session.authUser.email ?? ""}
              loginHref={`/dashboard/login?next=${encodeURIComponent(`/dashboard/invitacion?token=${encodeURIComponent(trimmedToken)}`)}`}
            />
          )}
        </div>
      </PageContainer>
    </main>
  );
}

function StatusCard({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="btn-brand mt-4 inline-flex h-10 items-center px-4 text-sm font-semibold"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
