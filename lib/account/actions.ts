"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { sendPasswordResetEmailAction } from "@/lib/auth/auth-email-actions";

const MIN_PASSWORD_LENGTH = 8;
const ACCOUNT_PATH = "/dashboard/cuenta";

export type AccountActionResult =
  | { ok: true; displayName?: string }
  | { ok: false; error: string };

export async function updateAccountProfileAction(input: {
  displayName: string;
}): Promise<AccountActionResult> {
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false, error: "Ingresa tu nombre." };
  }
  if (displayName.length > 80) {
    return { ok: false, error: "El nombre es demasiado largo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      full_name: displayName,
    },
  });

  if (error) {
    return { ok: false, error: formatAuthError(error.message) };
  }

  revalidatePath(ACCOUNT_PATH);
  return { ok: true, displayName };
}

export async function changeAccountPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<AccountActionResult> {
  if (!input.currentPassword.trim()) {
    return { ok: false, error: "Ingresa tu contraseña actual." };
  }
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (input.currentPassword === input.newPassword) {
    return {
      ok: false,
      error: "La nueva contraseña debe ser diferente a la actual.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });

  if (verifyError) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (updateError) {
    return { ok: false, error: formatAuthError(updateError.message) };
  }

  return { ok: true };
}

export async function sendAccountPasswordSetupEmailAction(): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const result = await sendPasswordResetEmailAction({ email: user.email });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
