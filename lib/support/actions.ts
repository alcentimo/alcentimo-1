"use server";

import { createClient } from "@/lib/supabase/server";

export type SupportFormState = {
  error?: string;
  success?: boolean;
};

/** Recibe mensajes de soporte/sugerencias (por ahora: log en servidor). */
export async function submitSupportMessage(
  _prev: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const message = String(formData.get("message") ?? "").trim();
  const contextStore = String(formData.get("storeName") ?? "").trim();

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

  console.info("[support-message]", {
    at: new Date().toISOString(),
    userId: user.id,
    email: user.email,
    storeName: contextStore || null,
    message,
  });

  return { success: true };
}
