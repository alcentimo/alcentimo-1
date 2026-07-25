"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  inviteStoreTeamMemberAction,
  removeStoreMemberAction,
  resendStoreInvitationAction,
  revokeStoreInvitationAction,
  updateStoreMemberRoleAction,
} from "@/lib/team/actions";
import { formatTeamLimitLabel } from "@/lib/team/limits";
import type { TeamLimitSummary } from "@/lib/team/types";
import {
  INVITABLE_ROLE_DESCRIPTIONS,
  INVITABLE_ROLE_LABELS,
  INVITABLE_TEAM_ROLES,
  ROLE_PERMISSIONS_SUMMARY,
  TEAM_ROLE_LABELS,
} from "@/lib/team/roles";
import {
  INVITATION_STATUS_LABELS,
  TEAM_MEMBER_STATUS_LABELS,
  type InvitationStatus,
  type TeamMemberStatus,
} from "@/lib/team/status";
import type {
  StoreInvitationRow,
  StoreTeamSnapshot,
  TeamMemberRow,
} from "@/lib/team/types";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";
import { cn } from "@/lib/cn";

interface TeamTabProps {
  initialTeam: StoreTeamSnapshot;
}

function formatExpiresAt(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TeamTab({ initialTeam }: TeamTabProps) {
  const [team, setTeam] = useState(initialTeam);
  const [limit, setLimit] = useState<TeamLimitSummary>(initialTeam.limit);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<(typeof INVITABLE_TEAM_ROLES)[number]>("staff");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { members, invitations, canManage, isOwner, currentUserId } = team;
  const canInvite = canManage && limit.canInviteMore && limit.canManageTeam;

  function refreshMessage(next: string | null, err?: string) {
    setError(err ?? null);
    setSuccess(err ? null : next);
  }

  function applyTeamResult(result: {
    team?: StoreTeamSnapshot;
    limit?: TeamLimitSummary;
    inviteUrl?: string;
    error?: string;
    emailSent?: boolean;
    emailError?: string;
  }) {
    if (result.limit) setLimit(result.limit);
    if (result.team) setTeam(result.team);
    if (result.inviteUrl) setInviteUrl(result.inviteUrl);
  }

  function handleInvite() {
    refreshMessage(null);
    setInviteUrl(null);
    startTransition(async () => {
      try {
        const result = await inviteStoreTeamMemberAction({
          email: inviteEmail,
          role: inviteRole,
        });
        applyTeamResult(result);
        if (result.error) {
          refreshMessage(null, result.error);
          return;
        }
        setInviteEmail("");
        if (result.emailSent) {
          refreshMessage("Invitación creada y correo enviado al invitado.");
        } else if (result.emailError) {
          refreshMessage(
            `Invitación creada, pero no se pudo enviar el correo: ${result.emailError} Puedes copiar el enlace abajo.`,
          );
        } else {
          refreshMessage("Invitación creada. Comparte el enlace con tu equipo.");
        }
      } catch {
        refreshMessage(
          null,
          "No se pudo procesar la invitación. Intenta de nuevo en unos segundos.",
        );
      }
    });
  }

  function handleResendInvitation(invitationId: string) {
    refreshMessage(null);
    startTransition(async () => {
      try {
        const result = await resendStoreInvitationAction(invitationId);
        applyTeamResult(result);
        if (result.error) {
          refreshMessage(null, result.error);
          return;
        }
        if (result.emailSent) {
          refreshMessage("Invitación reenviada por correo.");
        } else if (result.emailError) {
          refreshMessage(
            `Invitación renovada, pero no se pudo enviar el correo: ${result.emailError}`,
          );
        } else {
          refreshMessage("Invitación renovada. Comparte el enlace si hace falta.");
        }
      } catch {
        refreshMessage(null, "No se pudo reenviar la invitación.");
      }
    });
  }

  function handleRevokeInvitation(invitationId: string) {
    refreshMessage(null);
    startTransition(async () => {
      const result = await revokeStoreInvitationAction(invitationId);
      applyTeamResult(result);
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      refreshMessage("Invitación revocada.");
    });
  }

  function handleRemoveMember(memberId: string) {
    if (
      !window.confirm(
        "¿Eliminar el acceso de este miembro? Ya no podrá entrar al panel de la tienda.",
      )
    ) {
      return;
    }
    refreshMessage(null);
    startTransition(async () => {
      const result = await removeStoreMemberAction(memberId);
      applyTeamResult(result);
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      refreshMessage("Miembro eliminado del equipo.");
    });
  }

  function handleRoleChange(memberId: string, role: string) {
    refreshMessage(null);
    startTransition(async () => {
      const result = await updateStoreMemberRoleAction({ memberId, role });
      applyTeamResult(result);
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      refreshMessage("Rol actualizado.");
    });
  }

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      refreshMessage("Enlace copiado al portapapeles.");
    } catch {
      refreshMessage(null, "No se pudo copiar el enlace.");
    }
  }

  const usageLabel = limit.isUnlimited
    ? `${limit.usedSlots} usuarios activos o invitados`
    : `${limit.usedSlots} de ${limit.maxAllowed ?? limit.usedSlots} usuarios`;

  return (
    <SettingsTabShell hideSaveBar error={error}>
      {success ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <SettingsSection
        title="Miembros activos"
        description={`${formatTeamLimitLabel(limit)} · ${usageLabel}.`}
        variant="payments"
      >
        {!limit.canManageTeam ? (
          <div className="mb-4 rounded-lg border border-teal-200/80 bg-teal-50/60 px-3 py-2 text-xs text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200">
            Invita encargados y vendedores con Plan Business o Enterprise.{" "}
            <Link href={DASHBOARD_PLANS_HREF} className="font-semibold underline">
              Ver planes
            </Link>
          </div>
        ) : null}

        <div className="space-y-3">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              canManage={canManage}
              isOwner={isOwner}
              isSelf={member.user_id === currentUserId}
              disabled={pending}
              onRemove={() => handleRemoveMember(member.id)}
              onRoleChange={(role) => handleRoleChange(member.id, role)}
            />
          ))}
        </div>
      </SettingsSection>

      {invitations.length > 0 ? (
        <SettingsSection
          title="Invitaciones pendientes"
          description="Enlaces vigentes por 7 días. Revócalos si ya no aplican."
          variant="payments"
        >
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                canManage={canManage}
                disabled={pending}
                onResend={() => handleResendInvitation(invitation.id)}
                onRevoke={() => handleRevokeInvitation(invitation.id)}
              />
            ))}
          </div>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Permisos por rol"
        description="Resumen de lo que puede hacer cada rol en el panel."
        variant="payments"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(["owner", "admin", "staff"] as const).map((role) => (
            <article
              key={role}
              className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30"
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {ROLE_PERMISSIONS_SUMMARY[role].title}
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {ROLE_PERMISSIONS_SUMMARY[role].items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SettingsSection>

      {canManage ? (
        <SettingsSection
          title="Invitar miembro"
          description={
            canInvite
              ? "Genera un enlace de invitación para compartir por WhatsApp o correo."
              : limit.canManageTeam
                ? "Alcanzaste el límite de usuarios de tu plan."
                : "Mejora tu plan para invitar miembros."
          }
          variant="payments"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="team-invite-email">Correo</Label>
              <Input
                id="team-invite-email"
                type="email"
                autoComplete="email"
                placeholder="vendedor@ejemplo.com"
                value={inviteEmail}
                disabled={pending || !canInvite}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-invite-role">Rol</Label>
              <select
                id="team-invite-role"
                className="input-field h-10 w-full"
                value={inviteRole}
                disabled={pending || !canInvite}
                onChange={(event) =>
                  setInviteRole(event.target.value as typeof inviteRole)
                }
              >
                {INVITABLE_TEAM_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {INVITABLE_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              className="btn-brand h-10 gap-2"
              disabled={pending || !canInvite || !inviteEmail.trim()}
              onClick={handleInvite}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              Invitar
            </Button>
          </div>

          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {INVITABLE_ROLE_DESCRIPTIONS[inviteRole]}
          </p>

          {inviteUrl ? (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Enlace de invitación
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={copyInviteUrl}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copiar
                </Button>
              </div>
            </div>
          ) : null}
        </SettingsSection>
      ) : null}
    </SettingsTabShell>
  );
}

function MemberCard({
  member,
  canManage,
  isOwner,
  isSelf,
  disabled,
  onRemove,
  onRoleChange,
}: {
  member: TeamMemberRow;
  canManage: boolean;
  isOwner: boolean;
  isSelf: boolean;
  disabled: boolean;
  onRemove: () => void;
  onRoleChange: (role: string) => void;
}) {
  const canEditRole = isOwner && !member.is_owner && canManage;
  const canRemove =
    canManage && !member.is_owner && !isSelf;

  return (
    <article className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {member.email ?? "Usuario sin correo"}
            </p>
            <StatusBadge kind="member" status={member.status} />
            {isSelf ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Tú
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {member.is_owner ? TEAM_ROLE_LABELS.owner : TEAM_ROLE_LABELS[member.role]}
            {member.accepted_at
              ? ` · Se unió ${formatExpiresAt(member.accepted_at)}`
              : ` · Miembro desde ${formatExpiresAt(member.created_at)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditRole ? (
            <select
              className="input-field h-9 min-w-[9rem] text-xs"
              value={member.role === "owner" ? "admin" : member.role}
              disabled={disabled}
              onChange={(event) => onRoleChange(event.target.value)}
            >
              {INVITABLE_TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {INVITABLE_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                member.is_owner
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  : member.role === "admin"
                    ? "bg-teal-100 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
              )}
            >
              {member.is_owner ? (
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              {member.is_owner ? TEAM_ROLE_LABELS.owner : TEAM_ROLE_LABELS[member.role]}
            </span>
          )}

          {canRemove ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700 dark:text-red-400"
              disabled={disabled}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Eliminar acceso
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function InvitationCard({
  invitation,
  canManage,
  disabled,
  onResend,
  onRevoke,
}: {
  invitation: StoreInvitationRow;
  canManage: boolean;
  disabled: boolean;
  onResend: () => void;
  onRevoke: () => void;
}) {
  return (
    <article className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {invitation.email}
            </p>
            <StatusBadge kind="invitation" status={invitation.status} />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {INVITABLE_ROLE_LABELS[invitation.role]} · Expira{" "}
            {formatExpiresAt(invitation.expires_at)}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {invitation.last_sent_at
              ? `Último envío ${formatExpiresAt(invitation.last_sent_at)}`
              : `Creada ${formatExpiresAt(invitation.created_at)}`}
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={disabled}
              onClick={onResend}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reenviar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700 dark:text-red-400"
              disabled={disabled}
              onClick={onRevoke}
            >
              Revocar
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({
  kind,
  status,
}: {
  kind: "member";
  status: TeamMemberStatus;
} | {
  kind: "invitation";
  status: InvitationStatus;
}) {
  const label =
    kind === "member"
      ? TEAM_MEMBER_STATUS_LABELS[status]
      : INVITATION_STATUS_LABELS[status];

  const styles =
    kind === "member"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : status === "pending"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles,
      )}
    >
      {label}
    </span>
  );
}
