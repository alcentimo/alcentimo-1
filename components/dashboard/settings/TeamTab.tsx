"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
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
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  inviteStoreTeamMemberAction,
  refreshStoreInvitationLinkAction,
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
  normalizeInviteEmail,
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
import { cn } from "@/lib/cn";

interface TeamTabProps {
  initialTeam: StoreTeamSnapshot;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatExpiresAt(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getInitials(email: string | null, displayName: string | null): string {
  const name = displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const local = email?.split("@")[0]?.trim();
  if (local) return local.slice(0, 2).toUpperCase();
  return "?";
}

function validateInviteEmail(
  rawEmail: string,
  members: TeamMemberRow[],
): string | null {
  const trimmed = rawEmail.trim();
  if (!trimmed) return "Ingresa el correo del colaborador.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Ingresa un correo válido.";

  const normalized = normalizeInviteEmail(trimmed);
  if (
    members.some(
      (member) =>
        member.email != null &&
        normalizeInviteEmail(member.email) === normalized,
    )
  ) {
    return "Ese correo ya pertenece al equipo.";
  }
  return null;
}

function findPendingInvitation(
  rawEmail: string,
  invitations: StoreInvitationRow[],
): StoreInvitationRow | null {
  const normalized = normalizeInviteEmail(rawEmail);
  if (!normalized) return null;
  return (
    invitations.find(
      (invitation) =>
        invitation.status === "pending" &&
        normalizeInviteEmail(invitation.email) === normalized,
    ) ?? null
  );
}

function RoleBadge({
  role,
  isOwner,
}: {
  role: TeamMemberRow["role"];
  isOwner?: boolean;
}) {
  const label = isOwner ? TEAM_ROLE_LABELS.owner : TEAM_ROLE_LABELS[role];
  const styles = isOwner || role === "owner"
    ? "bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900/50"
    : role === "admin"
      ? "bg-teal-100 text-teal-900 ring-teal-200/80 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-900/50"
      : "bg-sky-100 text-sky-900 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-900/50";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        styles,
      )}
    >
      {isOwner || role === "owner" ? (
        <Shield className="h-3 w-3" aria-hidden="true" />
      ) : null}
      {label}
    </span>
  );
}

function StatusBadge({
  kind,
  status,
}:
  | { kind: "member"; status: TeamMemberStatus }
  | { kind: "invitation"; status: InvitationStatus }) {
  const label =
    kind === "member"
      ? TEAM_MEMBER_STATUS_LABELS[status]
      : INVITATION_STATUS_LABELS[status];

  const styles =
    kind === "member"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50"
      : status === "pending"
        ? "bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50"
        : "bg-zinc-100 text-zinc-600 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        styles,
      )}
    >
      {label}
    </span>
  );
}

function TeamCapacityBanner({ limit }: { limit: TeamLimitSummary }) {
  if (limit.canInviteMore) return null;

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      {limit.isUnlimited
        ? "Alcanzaste el límite técnico de usuarios para esta tienda."
        : `Tu plan ya usa ${limit.usedSlots} de ${limit.maxAllowed ?? limit.usedSlots} cupos de equipo.`}
    </div>
  );
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
  const [emailTouched, setEmailTouched] = useState(false);
  const [pending, startTransition] = useTransition();

  const { members, invitations, canManage, isOwner, currentUserId } = team;
  const canInvite = canManage && limit.canInviteMore;

  const emailValidationError = useMemo(() => {
    if (!emailTouched && !inviteEmail.trim()) return null;
    return validateInviteEmail(inviteEmail, members);
  }, [emailTouched, inviteEmail, members]);

  const matchingPendingInvitation = useMemo(() => {
    if (!inviteEmail.trim() || emailValidationError) return null;
    return findPendingInvitation(inviteEmail, invitations);
  }, [inviteEmail, emailValidationError, invitations]);

  const inviteFormValid =
    Boolean(inviteEmail.trim()) &&
    emailValidationError == null &&
    matchingPendingInvitation == null;

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

  async function copyText(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      refreshMessage("Enlace de invitación copiado. Ya puedes pegarlo en WhatsApp o correo.");
      return true;
    } catch {
      refreshMessage(null, "No se pudo copiar el enlace.");
      return false;
    }
  }

  function handleInvite(options?: { updateExisting?: boolean }) {
    setEmailTouched(true);
    const validation = validateInviteEmail(inviteEmail, members);
    if (validation) {
      refreshMessage(null, validation);
      return;
    }

    const pendingMatch = findPendingInvitation(inviteEmail, invitations);
    if (pendingMatch && !options?.updateExisting) {
      refreshMessage(
        null,
        "Ya hay una invitación pendiente para ese correo. Puedes actualizarla o copiar el enlace.",
      );
      return;
    }

    refreshMessage(null);
    setInviteUrl(null);
    startTransition(async () => {
      const invitedEmail = normalizeInviteEmail(inviteEmail);
      try {
        const result = await inviteStoreTeamMemberAction({
          email: inviteEmail,
          role: inviteRole,
          updateExisting: options?.updateExisting,
        });
        applyTeamResult(result);
        if (result.code === "PENDING_INVITE_EXISTS") {
          refreshMessage(
            null,
            "Ya hay una invitación pendiente para ese correo. Puedes actualizarla o copiar el enlace.",
          );
          return;
        }
        if (result.error) {
          refreshMessage(null, result.error);
          return;
        }
        setInviteEmail("");
        setEmailTouched(false);
        if (options?.updateExisting) {
          if (result.emailSent) {
            refreshMessage(
              `Invitación actualizada para ${invitedEmail}. Se envió un correo con el nuevo enlace.`,
            );
          } else if (result.emailError) {
            refreshMessage(
              `Invitación actualizada, pero no se pudo enviar el correo: ${result.emailError} Puedes copiar el enlace abajo.`,
            );
          } else {
            refreshMessage(
              "Invitación actualizada. Comparte el enlace con tu colaborador.",
            );
          }
          return;
        }
        if (result.emailSent) {
          refreshMessage(
            `Invitación enviada a ${invitedEmail}. El colaborador recibirá un correo para unirse.`,
          );
        } else if (result.emailError) {
          refreshMessage(
            `Invitación creada, pero no se pudo enviar el correo: ${result.emailError} Puedes copiar el enlace abajo.`,
          );
        } else {
          refreshMessage(
            "Invitación creada con éxito. Comparte el enlace con tu equipo.",
          );
        }
      } catch {
        refreshMessage(
          null,
          "No se pudo procesar la invitación. Intenta de nuevo en unos segundos.",
        );
      }
    });
  }

  function handleCopyInvitationLink(invitationId: string) {
    refreshMessage(null);
    startTransition(async () => {
      try {
        const result = await refreshStoreInvitationLinkAction(invitationId);
        applyTeamResult(result);
        if (result.error) {
          refreshMessage(null, result.error);
          return;
        }
        if (result.inviteUrl) {
          await copyText(result.inviteUrl);
        } else {
          refreshMessage(
            "Enlace generado. Usa el cuadro de abajo para copiarlo.",
          );
        }
      } catch {
        refreshMessage(null, "No se pudo generar el enlace de invitación.");
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
    if (
      !window.confirm(
        "¿Cancelar esta invitación? El enlace dejará de funcionar.",
      )
    ) {
      return;
    }
    refreshMessage(null);
    startTransition(async () => {
      const result = await revokeStoreInvitationAction(invitationId);
      applyTeamResult(result);
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      refreshMessage("Invitación cancelada.");
    });
  }

  function handleRemoveMember(memberId: string) {
    if (
      !window.confirm(
        "¿Revocar el acceso de este miembro? Ya no podrá entrar al panel de la tienda.",
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
      refreshMessage("Acceso revocado. El miembro ya no puede entrar al panel.");
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
      refreshMessage(
        `Rol actualizado a ${INVITABLE_ROLE_LABELS[role as keyof typeof INVITABLE_ROLE_LABELS] ?? role}.`,
      );
    });
  }

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    await copyText(inviteUrl);
  }

  const usageLabel = limit.isUnlimited
    ? `${limit.usedSlots} usuarios activos o invitados`
    : `${limit.usedSlots} de ${limit.maxAllowed ?? limit.usedSlots} usuarios`;

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  return (
    <SettingsTabShell hideSaveBar error={error}>
      {success ? (
        <p
          className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
          role="status"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span>{success}</span>
        </p>
      ) : null}

      <TeamCapacityBanner limit={limit} />

      <SettingsSection
        title="Miembros del equipo"
        description={`${formatTeamLimitLabel(limit)} · ${usageLabel}.`}
        variant="payments"
      >
        <div className="overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {members.map((member) => (
              <MemberRow
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
          </ul>

          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Aún no hay más miembros
              </p>
              <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                Invita a un encargado o vendedor para que te ayuden con pedidos e
                inventario.
              </p>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Invitaciones Pendientes"
        description={
          pendingInvitations.length > 0
            ? `${pendingInvitations.length} invitación${pendingInvitations.length === 1 ? "" : "es"} esperando respuesta.`
            : "Las invitaciones enviadas y aún no aceptadas aparecen aquí."
        }
        variant="payments"
      >
        {pendingInvitations.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
            <ul className="divide-y divide-amber-100/80 dark:divide-amber-900/30">
              {pendingInvitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  canManage={canManage}
                  disabled={pending}
                  onCopyLink={() => handleCopyInvitationLink(invitation.id)}
                  onResend={() => handleResendInvitation(invitation.id)}
                  onRevoke={() => handleRevokeInvitation(invitation.id)}
                />
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay invitaciones pendientes.
            </p>
          </div>
        )}
      </SettingsSection>

      {canManage ? (
        <SettingsSection
          title="Invitar miembro"
          description={
            canInvite
              ? "Envía una invitación por correo. El enlace también quedará listo para compartir."
              : "Alcanzaste el límite de usuarios de tu plan."
          }
          variant="payments"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-start">
            <div className="space-y-2">
              <Label htmlFor="team-invite-email">Correo</Label>
              <Input
                id="team-invite-email"
                type="email"
                autoComplete="email"
                placeholder="vendedor@ejemplo.com"
                value={inviteEmail}
                disabled={pending || !canInvite}
                aria-invalid={emailValidationError != null}
                aria-describedby={
                  emailValidationError ? "team-invite-email-error" : undefined
                }
                onBlur={() => setEmailTouched(true)}
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                  if (!emailTouched && event.target.value.trim()) {
                    setEmailTouched(true);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (canInvite && inviteFormValid && !pending) {
                      handleInvite();
                    }
                  }
                }}
                className={cn(
                  emailValidationError &&
                    "border-red-300 focus-visible:ring-red-200 dark:border-red-800",
                )}
              />
              {emailValidationError ? (
                <p
                  id="team-invite-email-error"
                  className="text-xs text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {emailValidationError}
                </p>
              ) : matchingPendingInvitation ? (
                <p className="text-xs text-amber-800 dark:text-amber-300" role="status">
                  Ya hay una invitación pendiente para este correo.
                </p>
              ) : inviteEmail.trim() && !emailValidationError ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Correo listo para invitar.
                </p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Usa el correo con el que iniciará sesión en Alcéntimo.
                </p>
              )}
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {INVITABLE_ROLE_DESCRIPTIONS[inviteRole]}
              </p>
            </div>
            <div className="sm:pt-7">
              <Button
                type="button"
                className="btn-brand h-10 w-full gap-2 sm:w-auto"
                disabled={pending || !canInvite || !inviteFormValid}
                onClick={() => handleInvite()}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                )}
                Invitar
              </Button>
            </div>
          </div>

          {matchingPendingInvitation && canManage ? (
            <div
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/20"
              role="status"
            >
              <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                Invitación pendiente para {matchingPendingInvitation.email}
              </p>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                Puedes actualizar el rol y regenerar el enlace, o copiarlo para
                enviarlo por WhatsApp o correo.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  disabled={pending}
                  onClick={() => handleInvite({ updateExisting: true })}
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Actualizar invitación
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={pending}
                  onClick={() =>
                    handleCopyInvitationLink(matchingPendingInvitation.id)
                  }
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar enlace
                </Button>
              </div>
            </div>
          ) : null}

          {inviteUrl ? (
            <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="mb-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                Enlace de invitación listo para compartir
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
              <div className="mb-2">
                <RoleBadge role={role} isOwner={role === "owner"} />
              </div>
              <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {ROLE_PERMISSIONS_SUMMARY[role].items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}

function MemberRow({
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
  const canRemove = canManage && !member.is_owner && !isSelf;
  const showActions = canEditRole || canRemove;
  const displayLabel =
    member.display_name?.trim() || member.email || "Usuario sin correo";
  const initials = getInitials(member.email, member.display_name);

  return (
    <li className="flex items-center gap-3 bg-white px-3 py-3.5 sm:gap-4 sm:px-4 dark:bg-zinc-950/40">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700"
        aria-hidden="true"
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {displayLabel}
          </p>
          {isSelf ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Tú
            </span>
          ) : null}
        </div>
        {member.email && member.display_name?.trim() ? (
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {member.email}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <RoleBadge role={member.role} isOwner={member.is_owner} />
          <StatusBadge kind="member" status={member.status} />
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          {member.accepted_at
            ? `Se unió ${formatExpiresAt(member.accepted_at)}`
            : `Miembro desde ${formatExpiresAt(member.created_at)}`}
        </p>
      </div>

      {showActions ? (
        <DropdownMenu
          align="end"
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              disabled={disabled}
              aria-label={`Acciones para ${displayLabel}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          }
        >
          {(close) => (
            <>
              {canEditRole
                ? INVITABLE_TEAM_ROLES.filter(
                    (role) => role !== member.role,
                  ).map((role) => (
                    <DropdownMenuItem
                      key={role}
                      disabled={disabled}
                      onClick={() => {
                        close();
                        onRoleChange(role);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Cambiar a {INVITABLE_ROLE_LABELS[role]}
                    </DropdownMenuItem>
                  ))
                : null}
              {canRemove ? (
                <DropdownMenuItem
                  destructive
                  disabled={disabled}
                  onClick={() => {
                    close();
                    onRemove();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Revocar acceso
                </DropdownMenuItem>
              ) : null}
            </>
          )}
        </DropdownMenu>
      ) : null}
    </li>
  );
}

function InvitationRow({
  invitation,
  canManage,
  disabled,
  onCopyLink,
  onResend,
  onRevoke,
}: {
  invitation: StoreInvitationRow;
  canManage: boolean;
  disabled: boolean;
  onCopyLink: () => void;
  onResend: () => void;
  onRevoke: () => void;
}) {
  const initials = getInitials(invitation.email, null);

  return (
    <li className="flex flex-col gap-3 bg-amber-50/40 px-3 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4 dark:bg-amber-950/15">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-amber-300/80 bg-amber-50 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {invitation.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={invitation.role} />
            <StatusBadge kind="invitation" status={invitation.status} />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            Expira {formatExpiresAt(invitation.expires_at)}
            {invitation.last_sent_at
              ? ` · Último envío ${formatExpiresAt(invitation.last_sent_at)}`
              : ` · Creada ${formatExpiresAt(invitation.created_at)}`}
          </p>
        </div>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={disabled}
            onClick={onCopyLink}
            title="Genera un enlace fresco y lo copia al portapapeles"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copiar enlace de invitación
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
            disabled={disabled}
            onClick={onRevoke}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Cancelar / Eliminar
          </Button>
          <DropdownMenu
            align="end"
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 shrink-0 p-0"
                disabled={disabled}
                aria-label={`Más acciones para la invitación de ${invitation.email}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
          >
            {(close) => (
              <DropdownMenuItem
                disabled={disabled}
                onClick={() => {
                  close();
                  onResend();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Reenviar por correo
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        </div>
      ) : null}
    </li>
  );
}
