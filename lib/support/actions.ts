"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import type { SupportMessageStatus } from "@/lib/database.types";
import { isSupportAdmin } from "@/lib/support/is-support-admin";
import { updateSupportMessageStatus as persistSupportMessageStatus } from "@/lib/support/get-support-messages";

export type SupportFormState = {
  error?: string;
  success?: boolean;
};

export type SupportStatusActionState = {
  error?: string;
  success?: boolean;
};

const SUPPORT_STATUSES: SupportMessageStatus[] = [
  "pendiente",
  "atendido",
  "cerrado",
];

/** Guarda un mensaje de soporte/sugerencias en Supabase. */
export async function submitSupportMessage(
  _prev: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const message = String(formData.get("message") ?? "").trim();

  if (message.length < 10) {
    return { error: "Escribe al menos 10 caracteres." };
  }
  if (message.length > 2000) {
    return { error: "El mensaje no puede superar 2000 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para enviar un mensaje." };
  }

  const email = user.email?.trim();
  if (!email) {
    return { error: "Tu cuenta no tiene un correo asociado." };
  }

  const { error } = await supabase.from("support_messages").insert({
    user_id: user.id,
    email,
    message,
    status: "pendiente",
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateSupportMessageStatusAction(
  messageId: string,
  status: SupportMessageStatus,
): Promise<SupportStatusActionState> {
  const supabase = await createClient();
  const authUser = await getAuthUserWithPlan(supabase);

  if (!authUser || !isSupportAdmin(authUser.email)) {
    return { error: "No tienes permiso para gestionar mensajes de soporte." };
  }

  if (!SUPPORT_STATUSES.includes(status)) {
    return { error: "Estado no válido." };
  }

  const result = await persistSupportMessageStatus(messageId, status);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/soporte");
  return { success: true };
}
